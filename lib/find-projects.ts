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
import {EVCb, NPMLinkUpMap, NLURunOpts} from "./npmlinkup";
import {q} from './search-queue';
import {mapPaths} from "./map-paths-with-env-vars";
const searchedPaths = {} as { [key: string]: true };

////////////////////////////////////////////////////////////////

export const createTask = function (searchRoot: string, findProject: any) {
  return function (cb: Function) {
    findProject(searchRoot, cb);
  }
};

export const makeFindProject = function (mainProjectName: string, totalList: Map<string, boolean>, map: NPMLinkUpMap,
                                         ignore: Array<RegExp>, opts: NLURunOpts, status: any) {

  let isIgnored = function (pth: string) {
    return ignore.some(r => {
      if (r.test(pth)) {
        if (opts.verbosity > 2) {
          log.warning(`Path with value "${pth}" was ignored because it matched the following regex:`);
          log.warning(`${r}`);
        }
        return true;
      }
    });
  };

  return function findProject(item: string, cb: EVCb) {

    item = path.normalize(item);

    if (searchedPaths[item]) {
      opts.verbosity > 2 && log.good('already searched this path, not searching again:', chalk.bold(item));
      return process.nextTick(cb);
    }

    let goodPth, keys = Object.keys(searchedPaths);

    // important - note that this section is not merely checking for equality.
    // it is instead checking to see if an existing search path is shorter
    // than the new search path, and if so, we don't need to add the new one

    const match = keys.some(function (pth) {
      if (String(item).indexOf(pth) === 0) {
        goodPth = pth;
        return true;
      }
    });

    if (match) {
      if (opts.verbosity > 2) {
        log.good(chalk.blue('path has already been covered:'));
        log.good('new path:', chalk.bold(item));
        log.good('already searched path:', chalk.bold(goodPth));
      }
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

      fs.readdir(dir, function (err: Error, items: Array<string>) {

        if (err) {
          log.error(err.message || err);
          return cb(err);
        }

        if (status.searching === false) {
          opts.verbosity > 2 && log.error('There was an error so we short-circuited search.');
          return process.nextTick(cb);
        }

        items = items.map(function (item) {
          return path.resolve(dir, item);
        });

        async.eachLimit(items as any, 3, function (item: string, cb: EVCb) {

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
              opts.verbosity > 2 && log.error('There was an error so we short-circuited search.');
              return process.nextTick(cb);
            }

            if (stats.isSymbolicLink()) {
              log.warning('warning => looks like a symlink => ', item);
              return cb();
            }

            if (stats.isDirectory()) {
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

            let pkg: any;

            try {
              pkg = require(item);
            }
            catch (err) {
              return cb(err);
            }

            let npmlinkup;

            try {
              npmlinkup = require(path.resolve(dirname + '/.nlu.json'));
            }
            catch (e) {
              //ignore
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

            map[pkg.name] = {
              name: pkg.name,
              bin: pkg.bin || null,
              isMainProject: pkg.name === mainProjectName,
              hasNPMLinkUpJSONFile: Boolean(npmlinkup),
              linkToItself: Boolean(npmlinkup && npmlinkup.linkToItself),
              runInstall: Boolean(npmlinkup && npmlinkup.alwaysReinstall),
              path: dirname,
              deps: deps || []
            };

            if (npmlinkup && (searchRoots = npmlinkup.searchRoots)) {

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
                  q.push(createTask(r, findProject));
                });

                cb(null);

              });

            }
            else {
              // no searchRoots, we can continue
              cb(null);
            }

          });

        }, cb);

      });

    })(item, cb);

  }
};
