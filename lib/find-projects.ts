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
import {EVCb, NLUDotJSON, NluMap, NLURunOpts} from "./index";
import {q} from './search-queue';
import {mapPaths} from "./map-paths-with-env-vars";
import {determineIfReinstallIsNeeded, getDevKeys, getProdKeys} from "./utils";
const searchedPaths = {} as { [key: string]: true };

//////////////////////////////////////////////////////////////////////

export const makeFindProject = function (mainProjectName: string, totalList: Map<string, true>, map: NluMap,
                                         ignore: Array<RegExp>, opts: NLURunOpts, status: any) {


  ////////////////////////////////////////////////////////////////////////

  const isPathSearchableBasic = function (item: string) {
    item = path.normalize(item);

    if (!path.isAbsolute(item)) {
      throw new Error('Path to be searched is not absolute:' + item);
    }

    if (searchedPaths[item]) {
      opts.verbosity > 2 && log.good('already searched this path, not searching again:', chalk.bold(item));
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
      opts.verbosity > 2 && log.good('already searched this path, not searching again:', chalk.bold(item));
      return false;
    }

    let goodPth = '';
    const keys = Object.keys(searchedPaths);

    // important - note that this section is not merely checking for equality.
    // it is instead checking to see if an existing search path is shorter
    // than the new search path, and if so, we don't need to add the new one

    const match = keys.some(function (pth) {
      if (String(item).startsWith(pth)) {
        goodPth = pth;
        return true;
      }
    });

    if (match && opts.verbosity > 1) {
      log.good(chalk.blue('path has already been covered:'));
      log.good('new path:', chalk.bold(item));
      log.good('already searched path:', chalk.bold(goodPth));
    }

    return match;
  };

  /////////////////////////////////////////////////////////////////////////

  const isIgnored = function (pth: string) {
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

  return function findProject(item: string, cb: EVCb<any>) {

    item = path.normalize(item);

    if (!isPathSearchableBasic(item)) {
      return process.nextTick(cb);
    }

    searchedPaths[item] = true;
    log.good('new path being searched:', chalk.blue(item));

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

      fs.readdir(dir, function (err: Error, items: Array<string>) {

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

        async.eachLimit(items as any, 3, function (item: string, cb: EVCb<any>) {

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
              return process.nextTick(cb);
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

            let dirname = path.dirname(item);
            let filename = path.basename(item);

            if (String(filename) !== 'package.json') {
              return cb(null);
            }

            let pkg: any, linkable = null;

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

            if (pkg.name === mainProjectName && linkable !== true) {
              if (opts.verbosity > 1) {
                log.info('Another project on your fs has your main projects package.json name, at path:', chalk.yellow.bold(dirname));
              }
              return cb(null);
            }

            let npmlinkup: NLUDotJSON;

            try {
              npmlinkup = require(path.resolve(dirname + '/.nlu.json'));
            }
            catch (e) {
              //ignore
            }

            if (npmlinkup && npmlinkup.linkable === false) {
              return cb(null);
            }

            let deps, searchRoots;
            if (npmlinkup && (deps = npmlinkup.list)) {

              try {
                assert(Array.isArray(deps),
                  `the 'list' property in an .nlu.json file is not an Array instance for '${filename}'.`);
              }
              catch (err) {
                return cb(err);
              }

              deps.forEach(function (item: string) {
                totalList.set(item, true);
              });
            }

            const m = map[pkg.name] = {
              name: pkg.name,
              bin: pkg.bin || null,
              isMainProject: false,
              linkToItself: Boolean(npmlinkup && npmlinkup.linkToItself),
              runInstall: Boolean(npmlinkup && npmlinkup.alwaysReinstall),
              path: dirname,
              deps: deps || []
            };

            const nm = path.resolve(dirname + '/node_modules');
            const keys = opts.production ? getProdKeys(pkg) : getDevKeys(pkg);

            async.autoInject({

              reinstall(cb: EVCb<any>) {

                if (!totalList.get(pkg.name)) {
                  return process.nextTick(cb);
                }

                determineIfReinstallIsNeeded(nm, keys, opts, (err, val) => {
                  m.runInstall = val === true;
                  if (val === true) {
                    log.debug(chalk.red('the following project needs reinstall:'), dirname);
                  }
                  cb(err);
                });
              },

              addToSearchRoots(cb: EVCb<any>) {

                searchRoots = npmlinkup && npmlinkup.searchRoots;

                if (!searchRoots) {
                  return cb(null);
                }

                if (!Array.isArray(searchRoots)) {
                  return cb(new Error('The "searchRoots" property is not an array in .nlu.json file at path: ' + dirname));
                }

                try {
                  assert(Array.isArray(searchRoots),
                    `the 'searchRoots' property in an .nlu.json file is not an Array instance for '${filename}'.`);
                }
                catch (err) {
                  return cb(err);
                }

                mapPaths(searchRoots, function (err: any, roots: Array<string>) {

                  if (err) {
                    return cb(err);
                  }

                  roots.forEach(function (r) {
                    if (isPathSearchable(r)) {
                      q.push(function (cb) {
                        findProject(r, cb);
                      });
                    }
                  });

                  cb(null);

                });
              }

            }, cb);

          });

        }, cb);

      });

    })(item, cb);

  }
};
