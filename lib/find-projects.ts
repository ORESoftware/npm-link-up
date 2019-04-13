'use strict';

//core
import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';

//npm
import async = require('async');
import chalk from 'chalk';

// project
import log from './logging';
import {EVCb, NLUDotJSON, NluMap, NluMapItem, PkgJSON} from "./index";
import {q} from './search-queue';
import {mapPaths} from "./map-paths";
import {
  determineIfReinstallIsNeeded,
  getDepsListFromNluJSON,
  getDevKeys,
  getProdKeys,
  getSearchRootsFromNluConf
} from "./utils";
import {NLURunOpts} from "./commands/run/cmd-line-opts";

const searchedPaths = {} as { [key: string]: true };
export const rootPaths: Array<string> = [];

export type Task = (cb: EVCb<any>) => void;
// searchQueue used to prevent too many dirs searched at once
const searchQueue = async.queue<Task, any>((task, cb) => task(cb), 8);

//////////////////////////////////////////////////////////////////////

export const makeFindProject = (mainDep: NluMapItem, totalList: Map<string, string>, defaultSearchRoots: Array<string>,
                                map: NluMap, ignore: Array<RegExp>, opts: NLURunOpts, status: any, conf: NLUDotJSON) => {
  
  const mainProjectName = mainDep.name;
  
  const isPathSearchableBasic = (item: string) => {
    
    item = path.normalize(item);
    
    if (!path.isAbsolute(item)) {
      throw new Error('Path to be searched is not absolute:' + item);
    }
    
    if (searchedPaths[item]) {
      opts.verbosity > 2 && log.info('already searched this path, not searching again:', chalk.bold(item));
      return false;
    }
    
    return true;
  };
  
  const isPathSearchable = function (item: string) {
    
    // if a path is not searchable, this returns true
    // iow, if a path is searchable, this returns falsy
    
    item = path.normalize(item);
    
    if (!path.isAbsolute(item)) {
      throw new Error('Path to be searched is not absolute:' + item);
    }
    
    if (searchedPaths[item]) {
      opts.verbosity > 2 && log.info('already searched this path, not searching again:', chalk.bold(item));
      return false;
    }
    
    let goodPth = '';
    const keys = Object.keys(searchedPaths);
    
    // important - note that this section is not merely checking for equality.
    // it is instead checking to see if an existing search path is shorter
    // than the new search path, and if so, we don't need to add the new one
    
    const match = keys.some(pth => {
      if (item.startsWith(pth)) {
        goodPth = pth;
        return true;
      }
    });
    
    if (match && opts.verbosity > 1) {
      log.info(chalk.blue('path has already been covered:'));
      log.info('potential new path:', chalk.bold(item));
      log.info('already searched path:', chalk.bold(goodPth));
    }
    
    return match;
  };
  
  /////////////////////////////////////////////////////////////////////////
  
  const isIgnored = (pth: string): boolean => {
    return ignore.some(r => {
      if (r.test(pth)) {
        if (opts.verbosity > 3) {
          log.warning(`Path with value "${pth}" was ignored because it matched the following regex:`);
          log.warning(`${r}`);
        }
        return true;
      }
    });
  };
  
  ///////////////////////////////////////////////////////////////////////////
  
  return function findProject(item: string, cb: EVCb<any>): void {
    
    item = path.normalize(item);
    
    if (!isPathSearchableBasic(item)) {
      return process.nextTick(cb);
    }
    
    searchedPaths[item] = true;
    rootPaths.push(item);
    log.info('New path being searched:', chalk.blue(item));
    
    (function getMarkers(dir, cb) {
      
      if (isIgnored(String(dir + '/'))) {
        if (opts.verbosity > 2) {
          log.warning('path ignored => ', dir);
        }
        return process.nextTick(cb);
      }
      
      if (status.searching === false) {
        opts.verbosity > 2 && log.error('There was an error so we short-circuited search.');
        return process.nextTick(cb);
      }
      
      searchedPaths[dir] = true;
      
      searchQueue.push(callback => {
        
        fs.readdir(dir, (err, items) => {
          
          callback();
          
          if (err) {
            log.error(err.message || err);
            if (String(err.message || err).match(/permission denied/)) {
              return cb(null);
            }
            return cb(err);
          }
          
          if (status.searching === false) {
            opts.verbosity > 2 && log.error('There was an error so we short-circuited search.');
            return process.nextTick(cb);
          }
          
          items = items.map(function (item) {
            return path.resolve(dir, item);
          });
          
          let deps: Array<string>, npmlinkup: NLUDotJSON, hasNLUJSONFile = false;
          
          const nluJSONPath = path.resolve(dir + '/.nlu.json');
          try {
            npmlinkup = require(nluJSONPath);
            hasNLUJSONFile = true;
            if (npmlinkup && npmlinkup.searchable === false) {
              log.warn('The following dir is not searchable:', dir);
              return cb(null);
            }
          }
          catch (e) {
            if(!/cannot find module/i.test(e.message)){
              log.error(chalk.redBright('Could not read .nlu.json file located here:'), chalk.redBright.bold(nluJSONPath));
              log.error('Looks like you have a JSON parsing error:\n', e);
              return cb(e);
            }
            npmlinkup = {} as NLUDotJSON;
          }
          
          async.eachLimit(items, 7, (item: string, cb: EVCb<any>) => {
            
            if (isIgnored(String(item))) {
              if (opts.verbosity > 2) {
                log.warning('path ignored => ', item);
              }
              return process.nextTick(cb);
            }
            
            fs.lstat(item, function (err, stats) {
              
              if (err) {
                log.warning('warning => maybe a symlink? => ', item);
                return cb();
              }
              
              if (status.searching === false) {
                opts.verbosity > 1 && log.error('There was an error so we short-circuited search.');
                return cb();
              }
              
              if (stats.isSymbolicLink()) {
                opts.verbosity > 2 && log.warning('warning => looks like a symlink => ', item);
                return cb();
              }
              
              if (stats.isDirectory()) {
                
                if (!isPathSearchableBasic(item)) {
                  return cb(null);
                }
                
                if (isIgnored(String(item + '/'))) {
                  if (opts.verbosity > 2) {
                    log.warning('path ignored by settings/regex => ', item);
                  }
                  cb(null);
                }
                else {
                  // continue drilling down
                  getMarkers(item, cb);
                }
                
                return;
              }
              
              if (!stats.isFile()) {
                if (opts.verbosity > 2) {
                  log.warning('Not a directory or file (maybe a symlink?) => ', item);
                }
                return cb(null);
              }
              
              const dirname = path.dirname(item);
              const filename = path.basename(item);
              
              if (filename !== 'package.json') {
                return cb(null);
              }
              
              let pkg: PkgJSON, linkable = null;
              
              try {
                pkg = require(item);
              }
              catch (err) {
                return cb(err);
              }
              
              try {
                linkable = pkg.nlu.linkable;
              }
              catch (err) {
                //ignore
              }
              
              if (linkable === false) {
                return cb(null);
              }
              
              if (pkg.name === mainProjectName && linkable !== true && dirname !== mainDep.path) {
                if (opts.verbosity > 1) {
                  log.info('Another project on your fs has your main projects package.json name, at path:', chalk.yellow.bold(dirname));
                }
                return cb(null);
              }
              
              if (npmlinkup.linkable === false) {
                log.warn(`Skipping project at dir "${dirname}" because 'linkable' was set to false.`);
                return cb(null);
              }
              
              const pkgFromConf = conf.packages[pkg.name] || {};
              npmlinkup = Object.assign({}, pkgFromConf, npmlinkup);
              
              try {
                deps = getDepsListFromNluJSON(npmlinkup);
                assert(
                  Array.isArray(deps),
                  `the 'list' property in an .nlu.json file is not an Array instance for '${filename}'.`
                );
              }
              catch (err) {
                log.error(chalk.redBright('Could not parse list/packages/deps properties from .nlu.json file at this path:'));
                log.error(chalk.redBright.bold(dirname));
                return cb(err);
              }
              
              if (map[dirname]) {
                log.warn('Map already has key: ' + dirname);
                return cb();
              }
  
              for(let item of deps){
                if(opts.every && totalList.has(item)){
                  let e = new Error(
                    `You passed the --every option, but more than one package with name '${item}' was found on disk.`
                  );
                  log.error(e.message);
                  // return cb(e)
                }
                totalList.set(item, dirname);
              }
  
              const nm = path.resolve(dirname + '/node_modules');
              const keys = opts.production ? getProdKeys(pkg) : getDevKeys(pkg);
              
              const m = map[dirname] = {
                name: pkg.name,
                bin: pkg.bin || null,
                hasNLUJSONFile,
                isMainProject: false,
                linkToItself: Boolean(npmlinkup.linkToItself),
                runInstall: Boolean(npmlinkup.alwaysReinstall),
                path: dirname,
                deps: deps,
                package: pkg,
                searchRoots: defaultSearchRoots.slice(0),
                installedSet: new Set(),
                linkedSet: {},
                depNamesFromPackageJSON: keys
              };
              
              
              async.autoInject({
                
                addToSearchRoots(cb: EVCb<any>) {
                  
                  const searchRoots = getSearchRootsFromNluConf(npmlinkup);
                  
                  if (searchRoots.length < 1) {
                    return process.nextTick(cb, null);
                  }
                  
                  mapPaths(searchRoots, dirname, (err: any, roots: Array<string>) => {
                    
                    if (err) {
                      return cb(err);
                    }
                    
                    m.searchRoots = roots.slice(0);
                    
                    roots.forEach(r => {
                      if (isPathSearchable(r)) {
                        log.info(chalk.cyan('Given the .nlu.json file at this path:'), chalk.bold(dirname));
                        log.info(chalk.cyan('We are adding this to the search queue:'), chalk.bold(r));
                        q.push(cb => findProject(r, cb));
                      }
                    });
                    
                    cb(null);
                    
                  });
                }
                
              }, cb);
              
            });
            
          }, cb);
          
        });
        
      });
      
    })(item, cb);
    
  }
};
