'use strict';

import * as assert from 'assert';
import Ajv = require('ajv');

const schema = require('../assets/nlu.schema.json');
import log from "./logging";
import {EVCb, NluConf, NluMap, NluMapItem, PkgJSON} from "./index";
import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';
import async = require('async');
import {NLURunOpts} from "./commands/run/cmd-line-opts";
import * as util from "util";
import semver = require('semver');
import * as residence from 'residence';

////////////////////////////////////////////////////////////////////

export const globalConfigFilePath = path.resolve(process.env.HOME + '/.nlu/global/settings.json');

export const getPath = (map: NluMap, dep: NluMapItem, opts: any) => {
  
  const loggerfn = opts.allow_missing ? log.warn : log.error;
  
  const isAccessible = (p: string) => {
    const matched = dep.searchRoots.some(r => p.startsWith(r));
    
    if (!matched) {
      loggerfn(`The following dep ${chalk.bold.gray(p)} is not accessible for project at path: ${chalk.bold.gray(dep.path)}`);
      loggerfn(`The available searchRoots are:`, JSON.stringify(dep.searchRoots));
    }
    
    return matched;
  };
  
  return (packageName: string) => {
    
    let path = null;
    for (let [key, val] of Object.entries(map)) {
      if (val.name === packageName) {
        if (val.path !== key) {
          throw new Error('Key of map should be the name as the path in value object => ' + util.inspect(val));
        }
        if (!isAccessible(val.path)) {
          continue;
        }
        if (path) {
          log.error(`More than one package with name '${chalk.gray.bold(packageName)}' is within the searchRoots for project: ${chalk.gray.bold(dep.path)}`);
          log.error(`The package '${chalk.bold(packageName)}' is located in at least two places:`);
          log.error(`1. ${chalk.gray.bold(path)}`);
          log.error(`2. ${chalk.gray.bold(val.path)}`);
          log.error(`To mitigate this problem, you can ignore one of the paths so that only one is visible to the project.`);
          throw 'Cannot continue processing.';
        }
        path = val.path;
      }
    }
    if (!path && !opts.allow_missing) {
      if(dep.explicitDeps.has(packageName)){
        log.error(`No package could be located on disk for package name: '${chalk.bold(packageName)}'.`);
        log.error(`To overcome this problem, either use the ${chalk.bold('--allow-missing')} flag, ` +
          'or include the desired package in your searchRoots in .nlu.json.');
        process.exit(1);
      }
    }
    return path;
  }
  
};

export const handleConfigCLIOpt = (cwd: string, opts: any) => {
  
  const configOpt = String(opts.config || '');
  let isFile = null, nluConfigRoot = '', nluFilePath = String(opts.config || '');
  
  if (configOpt) {
    
    if (!path.isAbsolute(opts.config)) {
      nluFilePath = path.resolve(cwd + '/' + String(configOpt || ''));
    }
    
    try {
      assert(fs.statSync(opts.config).isFile(), 'config path is not a file.');
      isFile = true;
    }
    catch (err) {
      
      isFile = false;
      nluFilePath = path.resolve(cwd + '/' + String(configOpt || '') + '/.nlu.json');
      
      try {
        assert(fs.statSync(opts.config).isFile(), 'config path is not a file.');
      }
      catch (err) {
        log.error(
          'You declared a config path using the -c option, but the following path is not a file:',
          chalk.bold(opts.config)
        );
        throw chalk.magenta(err.message);
      }
    }
    
  }
  
  if (nluFilePath) {
    nluConfigRoot = path.resolve(nluFilePath);
    if (isFile) {
      nluConfigRoot = path.dirname(nluConfigRoot);
    }
  }
  else {
    nluConfigRoot = residence.findRootDir(cwd, '.nlu.json');
  }
  
  if (!nluConfigRoot) {
    nluConfigRoot = cwd;
  }
  
  if (!nluFilePath) {
    nluFilePath = path.resolve(nluConfigRoot + '/.nlu.json');
  }
  
  return {nluFilePath, nluConfigRoot};
};

export const validateConfigFile = (data: NluConf) => {
  
  try {
    const ajv = new Ajv({allErrors: false}); // options can be passed, e.g. {allErrors: true}
    const validate = ajv.compile(schema);
    return true;
    // schema is broken for the moment
    const valid = validate(data);
    if (!valid) console.error(validate.errors);
    return valid;
  }
  catch (err) {
    log.error(err.message);
    return false;
  }
  
};

export const getUniqueList = (a: Array<any>): Array<any> => {
  return Array.from(new Set(a));
};

export const getDepsListFromNluJSON = (nluJSON: NluConf): Array<string> => {
  
  let list, deps, packages;
  
  try {
    if ('list' in nluJSON) {
      assert(Array.isArray(nluJSON.list), `"list" property is not an array => '${util.inspect(nluJSON)}'`);
      list = nluJSON.list;
    }
    
    if ('deps' in nluJSON) {
      assert(Array.isArray(nluJSON.deps), `"deps" property is not an array => '${util.inspect(nluJSON)}'`);
      deps = nluJSON.deps;
    }
    
    if ('packages' in nluJSON) {
      packages = Object.keys(nluJSON.packages).filter(v => nluJSON.packages[v]);
    }
  }
  catch (err) {
    log.error('config file was malformed:', nluJSON);
    throw chalk.magenta(err.message);
  }
  
  return getUniqueList(flattenDeep([list, packages, deps]).filter(Boolean));
  
};

export const getSearchRootsFromNluConf = (nluJSON: NluConf): Array<string> => {
  
  let searchRoots: Array<string | Array<string>> = [nluJSON.searchRoots, nluJSON.searchRoot];
  const searchRootsReduced: Array<string> = [];
  
  getUniqueList(flattenDeep(searchRoots))
    .map(d => String(d || '').trim())
    .filter(Boolean)
    .sort((a, b) => (a.length - b.length))
    .filter((v, i, a) => {
      
      const s = !a.some(p => {
        return p.startsWith(v + '/');
      });
      
      if (s) {
        searchRootsReduced.push(v);
      }
    });
  
  return searchRootsReduced;
  
};

export const flattenDeep = function (a: Array<any>): Array<any> {
  return a.reduce((acc, val) => Array.isArray(val) ? acc.concat(flattenDeep(val)) : acc.concat(val), []);
};

export const getProdKeys = (pkg: PkgJSON) => {
  return Object.keys(pkg.dependencies || {});
};

export const getDevKeys = (pkg: PkgJSON) => {
  return Object.keys(pkg.dependencies || {})
    .concat(Object.keys(pkg.devDependencies || {}))
    .concat(Object.keys(pkg.optionalDependencies || {}));
};

export const validateOptions = (opts: any) => {
  
  try {
    assert(opts.verbosity >= 1, chalk.magenta('Verbosity must be an integer between 1 and 4, inclusive'));
    assert(opts.verbosity <= 4, chalk.magenta('Verbosity must be an integer between 1 and 4, inclusive'));
  }
  catch (err) {
    log.error(err.message);
    return false;
  }
  
  return true;
  
};

export const mapConfigObject = (obj: any) => {
  return Object.keys(obj).reduce((a, b) => {
    const key = String(b).replace(/[^a-zA-z]+/g, '_').toLowerCase();
    return (a[key] = obj[b], a);
  }, {} as any);
};

const checkPackages = (dep: NluMapItem, m: Map<string, string>, sym: Set<string>): boolean => {
  
  const d = dep.package.dependencies || {};
  const cwd = process.cwd();
  return Object.keys(d).some(v => {
    const desiredVersion = d[v];
    
    if (sym.has(v)) {
      // this dep with name v is symlinked
      return false;
    }
    
    const installedVersion = m.get(v);
    
    try {
      
      // if(!semver.valid(desiredVersion)){
      //   log.warn(`The following semver version for package ${v} was not valid:`, desiredVersion);
      //   return false;
      // }
      //
      // if(!semver.valid(installedVersion)){
      //   log.warn(`The following semver version for package ${v} was not valid:`, installedVersion);
      //   return false;
      // }
      
      if (!/.*[0-9]{1,6}\.[0-9]{1,6}\.[0-9]{1,6}/.test(desiredVersion)) {
        log.warn(`In package.json located here: ./${chalk.bold(path.relative(cwd, dep.path))},`,
          `the following package version did not match a semverish regex:`,
          `'${chalk.bold(desiredVersion)}', for dep with name: ${chalk.bold(v)}`);
        return false;
      }
      
    }
    catch (err) {
      log.warn(err.message);
      return false;
    }
    
    try {
      // if the installed version does not satisfy the requirement, then we reinstall
      const satisfies = semver.satisfies(installedVersion, desiredVersion);
      if (!satisfies) {
        log.warn('package with name', v, 'is not satisfied. Installed version:',
          installedVersion, 'desired version:', desiredVersion);
      }
      return !satisfies;
    }
    catch (err) {
      log.warn(err.message);
      return false;
    }
  });
};

export const determineIfReinstallIsNeeded = (nodeModulesPath: string, dep: NluMapItem, depsKeys: Array<string>, opts: NLURunOpts, cb: EVCb<boolean>) => {
  
  const map = new Map<string, string>();
  const sym = new Set<string>();
  
  const result = {
    install: false
  };
  
  if (opts.no_install) {
    return process.nextTick(cb);
  }
  
  fs.readdir(nodeModulesPath, (err, originalItemsInNodeModules) => {
    
    if (err || !Array.isArray(originalItemsInNodeModules)) {
      // if there is an error, node_modules probably does not exist
      opts.verbosity > 1 && log.warn('Reinstalling because node_modules dir does not seem to exist in dir: ', nodeModulesPath);
      return cb(null, true);
    }
    
    const orgItems = originalItemsInNodeModules.filter(v => {
      return String(v).startsWith('@');
    });
    
    const topLevel = originalItemsInNodeModules.filter(v => {
      return !String(v).startsWith('@') && String(v) !== '.bin';
    });
    
    const totalValid = new Set(topLevel.slice(0));
    
    const processFolder = (name: string, folder: string, cb: EVCb<null>) => {
      
      totalValid.add(name);
      
      async.autoInject({
        stat(cb: EVCb<null>) {
          
          fs.lstat(folder, (err, stats) => {
            
            if (err) {
              result.install = true;
              return cb(err);
            }
            
            if (stats.isSymbolicLink()) {
              sym.add(name);
            }
            
            cb(null);
            
          });
          
        },
        package(cb: EVCb<null>) {
          
          const packageJSON = path.resolve(folder + '/package.json');
          fs.readFile(packageJSON, (err, data) => {
            
            if (err) {
              result.install = true;
              return cb(err);
            }
            
            try {
              const version = JSON.parse(String(data)).version;
              assert(version && typeof version === 'string', 'version is not defined, or not a string.');
              map.set(name, version);
            }
            catch (err) {
              result.install = true;
              return cb(err);
            }
            
            cb(null);
            
          });
        }
        
      }, cb);
      
    };
    
    async.autoInject({
      
      topLevel(cb: EVCb<null>) {
        
        async.eachLimit(topLevel, 3, (item, cb) => {
          const folder = path.resolve(nodeModulesPath + '/' + item);
          processFolder(item, folder, cb);
        }, cb);
        
      },
      
      orgLevel(cb: EVCb<null>) {
        
        async.eachLimit(orgItems, 3, (item, cb) => {
          
          const p = path.resolve(nodeModulesPath + '/' + item);
          
          fs.readdir(p, (err, orgtems) => {
            
            if (err) {
              result.install = true;
              return cb(err);
            }
            
            if (orgtems.length < 1) {
              return process.nextTick(cb);
            }
            
            async.eachLimit(orgtems, 5, (v, cb) => {
              
              const name = item + '/' + v;
              const folder = path.resolve(p + '/' + v);
              processFolder(name, folder, cb);
              
            }, cb);
            
          });
          
        }, cb);
        
      }
      
    }, (err) => {
      
      if (err && result.install === true) {
        return cb(null, true);
      }
      
      if (err) {
        return cb(err, false);
      }
      
      //
      // * this method was not accurate in determining whether a reinstall was needed, so it's commented out *
      //
      // if (originalItemsInNodeModules.length <= depsKeys.length) {
      //   // if there number of folders in node_modules is less than deps count, we def need to reinstall
      //   opts.verbosity > 1 && log.warn('Reinstalling because node_modules dir does not have enough folders: ', nodeModulesPath);
      //   opts.verbosity > 1 && log.warn();
      //   return cb(null, true);
      // }
      
      const allThere = depsKeys.every(d => {
        if (!totalValid.has(d)) {
          opts.verbosity > 1 && log.info('The following dep in package.json', d, 'did not appear to be in node_modules located here:', nodeModulesPath);
          return false
        }
        return true;
      });
      
      if (!allThere) {
        // if not all deps in package.json are folders in node_modules, we need to reinstall
        opts.verbosity > 1 && log.warn('Reinstalling because not all package.json dependencies exist in node_modules:', nodeModulesPath);
        return cb(null, true);
      }
      
      if (checkPackages(dep, map, sym)) {
        return cb(null, true);
      }
      
      cb(null, false);
      
    });
    
  });
  
};
