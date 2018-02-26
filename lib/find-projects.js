'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
var assert = require("assert");
var path = require("path");
var fs = require("fs");
var dashdash = require('dashdash');
var async = require("async");
var treeify = require('treeify');
var chalk = require("chalk");
var logging_1 = require("./logging");
var search_queue_1 = require("./search-queue");
var map_paths_with_env_vars_1 = require("./map-paths-with-env-vars");
var searchedPaths = {};
exports.createTask = function (searchRoot, findProject) {
    return function (cb) {
        findProject(searchRoot, cb);
    };
};
exports.makeFindProject = function (totalList, map, ignore, opts) {
    var isIgnored = function (pth) {
        return ignore.some(function (r) {
            if (r.test(pth)) {
                if (opts.verbosity > 2) {
                    logging_1.log.warning("Path with value \"" + pth + "\" was ignored because it matched the following regex:");
                    logging_1.log.warning("" + r);
                }
                return true;
            }
        });
    };
    return function findProject(item, cb) {
        item = path.normalize(item);
        if (searchedPaths[item]) {
            opts.verbosity > 2 && logging_1.log.good('already searched this path, not searching again:', chalk.bold(item));
            return process.nextTick(cb);
        }
        var goodPth, keys = Object.keys(searchedPaths);
        var match = keys.some(function (pth) {
            if (String(item).indexOf(pth) === 0) {
                goodPth = pth;
                return true;
            }
        });
        if (match) {
            if (opts.verbosity > 2) {
                logging_1.log.good(chalk.blue('path has already been covered:'));
                logging_1.log.good('new path:', chalk.bold(item));
                logging_1.log.good('already searched path:', chalk.bold(goodPth));
            }
            return process.nextTick(cb);
        }
        searchedPaths[item] = true;
        logging_1.log.warning('new path being searched:', chalk.blue(item));
        (function getMarkers(dir, cb) {
            if (isIgnored(String(dir + '/'))) {
                if (opts.verbosity > 2) {
                    logging_1.log.warning('path ignored => ', dir);
                }
                return process.nextTick(cb);
            }
            fs.readdir(dir, function (err, items) {
                if (err) {
                    console.error(err.stack || err);
                    return cb();
                }
                items = items.map(function (item) {
                    return path.resolve(dir, item);
                });
                async.eachLimit(items, 3, function (item, cb) {
                    if (isIgnored(String(item))) {
                        if (opts.verbosity > 2) {
                            logging_1.log.warning('path ignored => ', item);
                        }
                        return process.nextTick(cb);
                    }
                    fs.stat(item, function (err, stats) {
                        if (err) {
                            logging_1.log.warning('warning => probably a symlink? => ', item);
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
                                var deps = void 0, searchRoots = void 0;
                                if (npmlinkup && (deps = npmlinkup.list)) {
                                    assert(Array.isArray(deps), "the 'list' property in an npm-link-up.json file is not an Array instance for '" + filename + "'.");
                                    deps.forEach(function (item) {
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
                                if (npmlinkup && (searchRoots = npmlinkup.searchRoots)) {
                                    assert(Array.isArray(npmlinkup.list), "the 'list' property in an npm-link-up.json file is not an Array instance for '" + filename + "'.");
                                    map_paths_with_env_vars_1.mapPaths(searchRoots, function (err, roots) {
                                        if (err) {
                                            return cb(err);
                                        }
                                        roots.forEach(function (r) {
                                            search_queue_1.q.push(exports.createTask(r, findProject));
                                        });
                                        cb(null);
                                    });
                                }
                                else {
                                    cb();
                                }
                            }
                            else {
                                cb();
                            }
                        }
                        else if (stats.isDirectory()) {
                            if (isIgnored(String(item + '/'))) {
                                if (opts.verbosity > 2) {
                                    logging_1.log.warning('path ignored => ', item);
                                }
                                cb();
                            }
                            else {
                                getMarkers(item, cb);
                            }
                        }
                        else {
                            if (opts.verbosity > 1) {
                                logging_1.log.warning('Not a directory or file (maybe a symlink?) => ', item);
                            }
                            cb();
                        }
                    });
                }, cb);
            });
        })(item, cb);
    };
};
