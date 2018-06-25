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
import {EVCb, NLUAddOpts} from "../../npmlinkup";

////////////////////////////////////////////////////////////////

export const makeFindProjects = function (mainProjectName: string, ignore: Array<RegExp>,
                                          opts: NLUAddOpts, map: any, toAdd: Array<string>, status: any) {

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

    log.good('new path being searched:', chalk.blue(item));

    (function getMarkers(dir, cb) {

      if (status.searching === false) {
        return process.nextTick(cb);
      }

      if (isIgnored(String(dir + '/'))) {
        if (opts.verbosity > 2) {
          log.warning('path ignored => ', dir);
        }
        return process.nextTick(cb);
      }

      fs.readdir(dir, function (err, items) {

        if (err) {
          log.error('Could not read a directory at path:', dir);
          if (String(err.message || err).match(/scandir/)) {
            log.warn(err.message || err);
            return cb(null);
          }

          return cb(err);
        }

        if (status.searching === false) {
          return process.nextTick(cb);
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

            if (status.searching === false) {
              return process.nextTick(cb);
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

            let pkg: any, nluIsLink1 = true;

            try {
              pkg = require(item);
              nluIsLink1 = !(pkg.nlu && pkg.nlu.linkable === false)
            }
            catch (err) {
              return cb(err);
            }

            let npmlinkup: any, nluIsLink2 = true;

            try {
              npmlinkup = require(path.resolve(dirname + '/.nlu.json'));
              nluIsLink2 = npmlinkup['npm-link-up'] !== false
            }
            catch (e) {
              //ignore
            }


            let isAdd = false;
            const index = toAdd.indexOf(pkg.name);

            if((isAdd = (index > -1))){
              // remove that index
              toAdd.splice(index,1);
            }

            if (isAdd && nluIsLink1 && nluIsLink2) {

              if(toAdd.length < 1){
                // we are done searching
                status.searching = false;
              }

              log.good('We found a relevant project:', chalk.blueBright.bold(pkg.name), ', at path:', chalk.gray.bold(dirname));
              const helpLink = 'https://github.com/ORESoftware/npm-link-up/tree/master/docs/easy-duplicate-package-mitigation.md';

              if (map[pkg.name]) {
                // this pkg.name is already in the map!
                log.warn('The following package name exists in multiple package.json files on your fs:', pkg.name);
                return cb(new Error(`Multiple packages with name "${pkg.name}", to easily mitigate this problem see: ${chalk.blueBright(helpLink)}.`))
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
