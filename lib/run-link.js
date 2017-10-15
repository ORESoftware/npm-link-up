"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var util = require("util");
var cp = require("child_process");
var chalk = require("chalk");
var dashdash = require('dashdash');
var async = require("async");
var residence = require("residence");
var cwd = process.cwd();
var root = residence.findProjectRoot(cwd);
var treeify = require('treeify');
var streaming_1 = require("./streaming");
var logging_1 = require("./logging");
exports.runNPMLink = function ($map, totalList, opts, cb) {
    var map = {};
    Object.keys($map).filter(function (k) {
        return totalList.get(String(k));
    })
        .forEach(function (k) {
        map[k] = $map[k];
    });
    var keys = Object.keys(map);
    if (keys.length < 1) {
        return cb(new Error('NLU could not find any dependencies on the filesystem;' +
            ' perhaps broaden your search using searchRoots.'));
    }
    if (opts.treeify) {
        logging_1.log.warning('given the --treeify option passed at the command line, npm-link-up will only print out the dependency tree and exit.');
        logging_1.log.veryGood('the following is a complete list of recursively related dependencies:\n');
        logging_1.log.veryGood(util.inspect(Object.keys(map)));
        return process.nextTick(cb);
    }
    logging_1.log.good('=> Map => \n', chalk.magenta.bold(util.inspect(map)));
    function isAllLinked() {
        return Object.keys(map).every(function (k) {
            return map[k].isLinked;
        });
    }
    function getCountOfUnlinkedDeps(dep) {
        return dep.deps.filter(function (d) {
            if (!map[d]) {
                logging_1.log.warning("there is no dependency named " + d + " in the map.");
                return false;
            }
            return !map[d].isLinked;
        }).length;
    }
    function findNextDep() {
        var dep;
        var count = null;
        for (var name in map) {
            if (map.hasOwnProperty(name)) {
                var $dep = map[name];
                if (!$dep.isLinked) {
                    if (!count) {
                        dep = $dep;
                        count = dep.deps.length;
                    }
                    else if (getCountOfUnlinkedDeps($dep) < count) {
                        dep = $dep;
                        count = dep.deps.length;
                    }
                }
            }
        }
        if (!dep) {
            console.error(' => Internal implementation error => no dep found,\nbut there should be at least one yet-to-be-linked dep.');
            return process.exit(1);
        }
        return dep;
    }
    function getNPMLinkList(deps) {
        return deps.filter(function (d) {
            if (!map[d]) {
                logging_1.log.warning('Map for key ="' + d + '" is not defined.');
                return false;
            }
            else {
                return map[d] && map[d].isLinked;
            }
        })
            .map(function (d) {
            return "npm link " + d + " -f";
        });
    }
    function getCommandListOfLinked(name) {
        return Object.keys(map)
            .filter(function (k) {
            return map[k].isLinked && map[k].deps.includes(name);
        })
            .map(function (k) {
            return "cd " + map[k].path + " && npm link " + name + " -f";
        });
    }
    console.log('\n');
    function getInstallCommand(dep) {
        if (dep.runInstall || opts.install_all) {
            return '&& rm -rf node_modules && npm install --no-optional --log-level=warn --silent';
        }
    }
    function getLinkToItselfCommand(dep) {
        if (opts.self_link_all || (dep.linkToItself !== false)) {
            return "&& npm link " + String(dep.name).trim() + " -f";
        }
    }
    async.until(isAllLinked, function (cb) {
        if (opts.verbosity > 2) {
            logging_1.log.info("Searching for next dep to run.");
        }
        var dep = findNextDep();
        if (opts.verbosity > 1) {
            logging_1.log.good("Processing dep with name => '" + chalk.bold(dep.name) + "'.");
        }
        var deps = getNPMLinkList(dep.deps);
        var links = deps.length > 0 ? '&& ' + deps.join(' && ') : '';
        var script = [
            "cd " + dep.path,
            getInstallCommand(dep),
            links,
            '&& npm link -f',
            getLinkToItselfCommand(dep)
        ].filter(function (i) { return i; }).join(' ');
        logging_1.log.info("Script is => \"" + script + "\"");
        var k = cp.spawn('bash', [], {
            env: Object.assign({}, process.env, {
                NPM_LINK_UP: 'yes'
            })
        });
        k.stdin.write('\n' + script + '\n');
        streaming_1.stdoutStrm.write("\n\n >>> Beginning of \"" + dep.name + "\"...\n\n");
        streaming_1.stdoutStrm.write("\n\n >>> Running script => \"" + script + "\"...\n\n");
        k.stdout.setEncoding('utf8');
        k.stderr.setEncoding('utf8');
        k.stdout.pipe(streaming_1.stdoutStrm, { end: false });
        k.stderr.pipe(streaming_1.stderrStrm, { end: false });
        process.nextTick(function () {
            k.stdin.end();
        });
        var stderr = '';
        k.stderr.on('data', function (d) {
            stderr += d;
        });
        k.once('error', cb);
        k.once('exit', function (code) {
            if (code > 0 && /ERR/i.test(stderr)) {
                console.log('\n');
                logging_1.log.error("Dep with name \"" + dep.name + "\" is done, but with an error.");
                cb({
                    code: code,
                    dep: dep,
                    error: stderr
                });
            }
            else {
                if (opts.verbosity > 1) {
                    logging_1.log.veryGood("Dep with name '" + chalk.bold(dep.name) + "' is done.");
                }
                dep.isLinked = map[dep.name].isLinked = true;
                var linkPreviouslyUnlinked = function (cb) {
                    var cmds = getCommandListOfLinked(dep.name);
                    if (!cmds.length) {
                        return process.nextTick(cb);
                    }
                    var cmd = cmds.join(' && ');
                    streaming_1.stdoutStrm.write("\n => Running this command for \"" + dep.name + "\" =>\n\"" + cmd + "\".\n\n\n");
                    var k = cp.spawn('bash', [], {
                        env: Object.assign({}, process.env, {
                            NPM_LINK_UP: 'yes'
                        })
                    });
                    k.stdin.write('\n' + cmd + '\n');
                    k.stdout.setEncoding('utf8');
                    k.stderr.setEncoding('utf8');
                    k.stdout.pipe(streaming_1.stdoutStrm, { end: false });
                    k.stderr.pipe(streaming_1.stderrStrm, { end: false });
                    process.nextTick(function () {
                        k.stdin.end();
                    });
                    k.once('exit', cb);
                };
                linkPreviouslyUnlinked(function (err) {
                    cb(err, {
                        code: code,
                        dep: dep,
                        error: stderr
                    });
                });
            }
        });
    }, cb);
};
