'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
var assert = require("assert");
var path = require("path");
var fs = require("fs");
var dashdash = require('dashdash');
var colors = require('colors/safe');
var async = require('async');
var treeify = require('treeify');
var logging_1 = require("./logging");
exports.makeFindProject = function (q, totalList, map, isIgnored, opts) {
    return function (item, cb) {
        (function getMarkers(dir, cb) {
            fs.readdir(dir, function (err, items) {
                if (err) {
                    console.error(err.stack || err);
                    return cb();
                }
                items = items.map(function (item) {
                    return path.resolve(dir, item);
                });
                async.eachLimit(items, 3, function (item, cb) {
                    fs.stat(item, function (err, stats) {
                        if (err) {
                            console.log(' => [npm-link-up internal] => probably a symlink? => ', item);
                            console.error(err.stack || err);
                            return cb();
                        }
                        if (stats.isFile()) {
                            var dirname = path.dirname(item);
                            var filename = path.basename(item);
                            if (String(filename) === 'package.json') {
                                var pkg = void 0;
                                try {
                                    pkg = require(item);
                                }
                                catch (err) {
                                    return cb(err);
                                }
                                var newItems_1 = [];
                                var npmlinkup = void 0;
                                try {
                                    npmlinkup = require(path.resolve(dirname + '/npm-link-up.json'));
                                }
                                catch (e) {
                                }
                                var isNodeModulesPresent = false;
                                try {
                                    isNodeModulesPresent = fs.statSync(path.resolve(dirname + '/node_modules')).isDirectory();
                                }
                                catch (e) {
                                }
                                var isAtLinkShPresent = false;
                                try {
                                    isAtLinkShPresent = fs.statSync(path.resolve(dirname + '/@link.sh')).isFile();
                                }
                                catch (e) {
                                }
                                var deps = void 0;
                                if (npmlinkup && npmlinkup.list) {
                                    assert(Array.isArray(npmlinkup.list), "{npm-link-up.json}.list is not an Array instance for " + filename + ".");
                                    deps = npmlinkup.list;
                                    npmlinkup.list.forEach(function (item) {
                                        if (totalList.indexOf(item) < 0) {
                                            totalList.push(item);
                                            newItems_1.push(item);
                                        }
                                    });
                                }
                                map[pkg.name] = {
                                    name: pkg.name,
                                    hasNPMLinkUpJSONFile: !!npmlinkup,
                                    linkToItself: !!(npmlinkup && npmlinkup.linkToItself),
                                    runInstall: !isNodeModulesPresent,
                                    hasAtLinkSh: isAtLinkShPresent,
                                    path: dirname,
                                    deps: deps || []
                                };
                            }
                            cb();
                        }
                        else if (stats.isDirectory()) {
                            if (isIgnored(String(item))) {
                                if (opts.verbosity > 2) {
                                    logging_1.logWarning('node_modules/.git path ignored => ', item);
                                }
                                cb();
                            }
                            else {
                                getMarkers(item, cb);
                            }
                        }
                        else {
                            if (opts.verbosity > 1) {
                                logging_1.logWarning('Not a directory or file (maybe a symlink?) => ', item);
                            }
                            cb();
                        }
                    });
                }, cb);
            });
        })(item, cb);
    };
};
