"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var util = require("util");
var cp = require("child_process");
var chalk = require("chalk");
var dashdash = require('dashdash');
var async = require('async');
var residence = require('residence');
var cwd = process.cwd();
var root = residence.findProjectRoot(cwd);
var treeify = require('treeify');
var streaming_1 = require("./streaming");
var logging_1 = require("./logging");
exports.runNPMLink = function (map, totalList, opts, cb) {
    if (opts.treeify) {
        logging_1.logWarning('given the --treeify option passed at the command line, ' +
            'npm-link-up will only print out the dependency tree and exit.');
        return process.nextTick(cb);
    }
    Object.keys(map).filter(function (k) {
        return totalList.indexOf(k) < 0;
    }).forEach(function (k) {
        delete map[k];
    });
    var keys = Object.keys(map);
    if (!keys.length) {
        return cb(new Error(' => No deps could be found.'));
    }
    logging_1.logGood('=> Map => \n', chalk.magenta.bold(util.inspect(map)));
    function isAllLinked() {
        return Object.keys(map).every(function (k) {
            return map[k].isLinked;
        });
    }
    function getCountOfUnlinkedDeps(dep) {
        return dep.deps.filter(function (d) {
            if (!map[d]) {
                logging_1.logWarning("there is no dependency named " + d + " in the map.");
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
                logging_1.logWarning('Map for key ="' + d + '" is not defined.');
                return false;
            }
            else {
                return map[d] && map[d].isLinked;
            }
        })
            .map(function (d) {
            return "npm link " + d;
        });
    }
    function getCommandListOfLinked(name) {
        return Object.keys(map)
            .filter(function (k) {
            return map[k].isLinked && map[k].deps.includes(name);
        })
            .map(function (k) {
            return "cd " + map[k].path + " && npm link " + name;
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
            return "&& npm link " + String(dep.name).trim();
        }
    }
    async.until(isAllLinked, function (cb) {
        if (opts.verbosity > 2) {
            logging_1.logInfo("Searching for next dep to run.");
        }
        var dep = findNextDep();
        if (opts.verbosity > 1) {
            logging_1.logGood('Processing dep with name => ', dep.name);
        }
        var deps = getNPMLinkList(dep.deps);
        var links = deps.length > 0 ? '&& ' + deps.join(' && ') : '';
        var script = [
            "cd " + dep.path,
            getInstallCommand(dep),
            links,
            '&& npm link',
            getLinkToItselfCommand(dep)
        ].filter(function (i) { return i; }).join(' ');
        logging_1.logInfo('Script is => ', script);
        console.log('\n');
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
                logging_1.logError("Dep with name \"" + dep.name + "\" is done, but with an error.");
                cb({
                    code: code,
                    dep: dep,
                    error: stderr
                });
            }
            else {
                if (opts.verbosity > 1) {
                    logging_1.logGood("Dep with name \"" + dep.name + "\" is done.\n");
                    console.log('\n');
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
