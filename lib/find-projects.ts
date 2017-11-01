'use strict';

//typescript
import {AsyncQueue} from '@types/async';

//core
import * as util from 'util';
import * as assert from 'assert';
import * as path from 'path';
import * as EE from 'events';
import * as fs from 'fs';
import * as stream from 'stream';
import * as cp from 'child_process';

//npm
const dashdash = require('dashdash');
import async = require('async');
const treeify = require('treeify');
import {stdoutStrm, stderrStrm} from './streaming';
import {log} from './logging';
import {INPMLinkUpMap, INPMLinkUpOpts} from "../index";

////////////////////////////////////////////////////////////////

export const makeFindProject = function (q: AsyncQueue, totalList: Map<string, boolean>, map: INPMLinkUpMap,
                                         ignore: Array<RegExp>, opts: INPMLinkUpOpts) {

  let isIgnored = function (pth: string) {
    return ignore.some(function (r: RegExp) {
      if (r.test(pth)) {
        if (opts.verbosity > 2) {
          log.warning(`\n=> Path with value ${pth} was ignored because it matched the following regex:\n${r}`);
        }
        return true;
      }
    });
  };

  return function (item: string, cb: Function) {

    (function getMarkers(dir, cb) {

      if (isIgnored(String(dir + '/'))) {
        if (opts.verbosity > 2) {
          log.warning('path ignored => ', dir);
        }
        return process.nextTick(cb);
      }

      fs.readdir(dir, function (err: Error, items: Array<string>) {

        if (err) {
          console.error(err.stack || err);
          return cb();
        }

        items = items.map(function (item) {
          return path.resolve(dir, item);
        });

        async.eachLimit(items, 3, function (item: string, cb: Function) {

          if (isIgnored(String(item))) {
            if (opts.verbosity > 2) {
              log.warning('path ignored => ', item);
            }
            return process.nextTick(cb);
          }

          fs.stat(item, function (err, stats) {

            if (err) {
              log.warning('warning => probably a symlink? => ', item);
              return cb();
            }

            if (stats.isFile()) {
              let dirname = path.dirname(item);
              let filename = path.basename(item);

              if (String(filename) === 'package.json') {

                let pkg: Object;

                try {
                  pkg = require(item);
                }
                catch (err) {
                  return cb(err);
                }

                let npmlinkup;

                try {
                  npmlinkup = require(path.resolve(dirname + '/npm-link-up.json'));
                }
                catch (e) {
                  //ignore
                }

                let isNodeModulesPresent = false;

                try {
                  isNodeModulesPresent = fs.statSync(path.resolve(dirname + '/node_modules')).isDirectory();
                }
                catch (e) {
                  //ignore
                }

                let isAtLinkShPresent = false;

                try {
                  isAtLinkShPresent = fs.statSync(path.resolve(dirname + '/@link.sh')).isFile();
                }
                catch (e) {
                  //ignore
                }

                let deps;

                if (npmlinkup && (deps = npmlinkup.list)) {
                  assert(Array.isArray(npmlinkup.list),
                    `the 'list' property in an npm-link-up.json file is not an Array instance for '${filename}'.`);
                  npmlinkup.list.forEach(function (item: string) {
                    totalList.set(item, true);
                  });
                }

                map[pkg.name] = {
                  name: pkg.name,
                  hasNPMLinkUpJSONFile: !!npmlinkup,
                  linkToItself: !!(npmlinkup && npmlinkup.linkToItself),
                  runInstall: !isNodeModulesPresent || (npmlinkup && npmlinkup.alwaysReinstall),
                  hasAtLinkSh: isAtLinkShPresent,
                  path: dirname,
                  deps: deps || []
                };
              }

              // TODO: push things onto the queue
              cb();
            }
            else if (stats.isDirectory()) {
              if (isIgnored(String(item + '/'))) {
                if (opts.verbosity > 2) {
                  log.warning('node_modules/.git path ignored => ', item);
                }
                cb();
              }
              else {
                // continue drilling down
                getMarkers(item, cb);
              }
            }
            else {
              if (opts.verbosity > 1) {
                log.warning('Not a directory or file (maybe a symlink?) => ', item);
              }
              cb();
            }

          });

        }, cb);

      });

    })(item, cb);

  }
};
