'use strict';

//core
import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';

//npm
import async = require('async');
import chalk from 'chalk';

// project
import log from '../../logging';
import {EVCb, NLUInitOpts, NPMLinkUpMap} from "../../npmlinkup";

////////////////////////////////////////////////////////////////

export const makeFindProjects = function (mainProjectName: string, ignore: Array<RegExp>,
                                          opts: NLUInitOpts, map: any, theirDeps: any) {

  const totalList = new Map<string, boolean>();

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

    log.warning('new path being searched:', chalk.blue(item));

    (function getMarkers(dir, cb) {

      if (isIgnored(String(dir + '/'))) {
        if (opts.verbosity > 2) {
          log.warning('path ignored => ', dir);
        }
        return process.nextTick(cb);
      }

      fs.readdir(dir, function (err, items) {

        if (err) {
          log.error(err.message || err);
          return cb(null);
        }

        items = items.map(function (item) {
          return path.resolve(dir, item);
        });

        async.eachLimit(items, 3, function (item: string, cb: EVCb) {

          if (isIgnored(String(item))) {
            if (opts.verbosity > 2) {
              log.warning('path ignored => ', item);
            }
            return process.nextTick(cb);
          }

          fs.lstat(item, function (err, stats) {

            if (err) {
              opts.verbosity > 2 && log.warning('warning => maybe a symlink? => ', err.message || err);
              return cb(null);
            }

            if (stats.isSymbolicLink()) {
              opts.verbosity > 2 && log.warning('warning => looks like a symlink => ', item);
              return cb();
            }

            if (stats.isDirectory()) {
              if (isIgnored(String(item + '/'))) {
                if (opts.verbosity > 2) {
                  opts.verbosity > 2 && log.warning('path ignored by settings/regex => ', item);
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
              opts.verbosity > 2 && log.warning('Not a directory or file (maybe a symlink?) => ', item);
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

            if (theirDeps[pkg.name]) {

              log.warn('We found a relevant project:', chalk.blueBright.bold(pkg.name), ', at path:', chalk.gray.bold(dirname));

              if (map[pkg.name]) {
                // this pkg.name is already in the map!
                log.warn('The following package name exists in multiple package.json files on your fs:', pkg.name);
              }

              map[pkg.name] = {
                name: pkg.name,
                isMainProject: pkg.name === mainProjectName,
                hasNPMLinkUpJSONFile: Boolean(npmlinkup),
                path: dirname,
              };
            }

            cb(null);

          });

        }, cb);

      });

    })(item, cb);

  }
};
