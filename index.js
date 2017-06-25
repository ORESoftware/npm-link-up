#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var util = require("util");
var path = require("path");
var fs = require("fs");
var cp = require("child_process");
var dashdash = require('dashdash');
var colors = require('colors/safe');
var async = require('async');
var residence = require('residence');
var cwd = process.cwd();
var root = residence.findProjectRoot(cwd);
var treeify = require('treeify');
var streaming_1 = require("./lib/streaming");
var map_paths_with_env_vars_1 = require("./lib/map-paths-with-env-vars");
var cache_clean_1 = require("./lib/cache-clean");
var always_ignore_1 = require("./lib/always-ignore");
var logging_1 = require("./lib/logging");
process.once('exit', function (code) {
    console.log('\n\n => NPM-Link-Up is exiting with code => ', code, '\n');
});
var options = require('./lib/cmd-line-opts').default;
var opts, parser = dashdash.createParser({ options: options });
try {
    opts = parser.parse(process.argv);
}
catch (e) {
    console.error(' => CLI parsing error: %s', e.message);
    process.exit(1);
}
if (opts.version) {
    var npmLinkUpPkg = require('./package.json');
    console.log(npmLinkUpPkg.version);
    process.exit(0);
}
if (opts.help) {
    var help = parser.help({ includeEnv: true }).trimRight();
    console.log('usage: node foo.js [OPTIONS]\n'
        + 'options:\n'
        + help);
    process.exit(0);
}
if (opts.completion) {
    var generatedBashCode = dashdash.bashCompletionFromOptions({
        name: 'npmlinkup',
        options: options,
        includeHidden: true
    });
    console.log(generatedBashCode);
    process.exit(0);
}
if (!root) {
    console.error(' => NPM-Link-Up => You do not appear to be within an NPM project (no package.json could be found).\n' +
        ' => Your present working directory is =>\n' + colors.magenta.bold(cwd));
    process.exit(1);
}
var isTreeify = opts.treeify;
var pkg, conf;
try {
    pkg = require(path.resolve(root + '/package.json'));
}
catch (e) {
    console.error('\n', e.stack || e, '\n');
    console.error(colors.magenta.bold(' => Bizarrely, you do not have a "package.json" file in the root of your project.'));
    process.exit(1);
}
try {
    conf = require(path.resolve(root + '/npm-link-up.json'));
}
catch (e) {
    console.error('\n', e.stack || e, '\n');
    console.error(colors.magenta.bold(' => You do not have an "npm-link-up.json" file in the root of your project. ' +
        'You need this config file for npmlinkup to do it\'s thing.'));
    process.exit(1);
}
var NLU = require('./schemas/npm-link-up-schema');
new NLU(conf, false).validate();
var name = pkg.name;
if (!name) {
    console.error(' => Ummmm, your package.json file does not have a name property. Fatal.');
    process.exit(1);
}
var deps = Object.keys(pkg.dependencies || {})
    .concat(Object.keys(pkg.devDependencies || {}))
    .concat(Object.keys(pkg.optionalDependencies || {}));
var list = conf.list;
if (list.length < 1) {
    console.error('\n', colors.magenta(' => You do not have any dependencies listed in your npm-link-up.json file.'));
    console.log('\n\n', colors.cyan.bold(util.inspect(conf)));
    process.exit(1);
}
var searchRoots;
if (opts.search_root && opts.search_root.length > 0) {
    searchRoots = opts.search_root.filter(function (item, i, arr) {
        return arr.indexOf(item) === i;
    });
}
else {
    if (!conf.searchRoots) {
        console.error(' => Warning => no "searchRoots" property provided in npm-link-up.json file. ' +
            'NPM-Link-Up will therefore search through your entire home directory.');
        if (opts.force) {
            searchRoots = [path.resolve(process.env.HOME)];
        }
        else {
            console.error(' => You must use --force to do this.');
            process.exit(1);
        }
    }
    searchRoots = (conf.searchRoots || []).concat(opts.search_root_append || [])
        .filter(function (item, i, arr) {
        return arr.indexOf(item) === i;
    });
}
var inListButNotInDeps = [];
var inListAndInDeps = list.filter(function (item) {
    if (!deps.includes(item)) {
        inListButNotInDeps.push(item);
        return false;
    }
    return true;
});
inListButNotInDeps.forEach(function (item) {
    logging_1.logWarning('warning, the following item was listed in your npm-link-up.json file,\n' +
        'but is not listed in your package.json dependencies => "' + item + '".');
});
var originalList = list.slice(0);
list.push(name);
list = list.filter(function (item, index) {
    return list.indexOf(item) === index;
});
var totalList = list.slice(0);
var ignore = (conf.ignore || []).concat(always_ignore_1.default)
    .filter(function (item, index, arr) {
    return arr.indexOf(item) === index;
}).map(function (item) {
    return new RegExp(item);
});
function isIgnored(pth) {
    return ignore.some(function (r) {
        if (r.test(pth)) {
            if (opts.verbosity > 2) {
                console.log("\n=> Path with value " + pth + " was ignored because it matched the following regex:\n" + r);
            }
            return true;
        }
    });
}
if (ignore.length > 0) {
    console.log('\n => NPM Link Up will ignore paths that match any of the following => ');
    ignore.forEach(function (item) {
        console.log(colors.gray.bold(item));
    });
}
console.log('\n');
originalList.forEach(function (item) {
    logging_1.logGood("The following dep will be NPM link'ed to this project => \"" + item + "\".");
});
console.log('\n');
if (opts.inherit_log) {
    streaming_1.stdoutStrm.pipe(process.stdout);
    streaming_1.stderrStrm.pipe(process.stderr);
}
if (opts.log) {
    streaming_1.stdoutStrm.pipe(fs.createWriteStream(path.resolve(root + '/npm-link-up.log')));
    streaming_1.stderrStrm.pipe(fs.createWriteStream(path.resolve(root + '/npm-link-up.log')));
}
var map = {};
async.autoInject({
    npmCacheClean: function (cb) {
        if (!opts.clear_all_caches) {
            return process.nextTick(cb);
        }
        cache_clean_1.cleanCache(cb);
    },
    searchRoots: function (npmCacheClean, cb) {
        map_paths_with_env_vars_1.mapPaths(searchRoots, cb);
    },
    findItems: function (searchRoots, cb) {
        console.log('\n');
        logging_1.logInfo('Searching these roots => \n', colors.magenta(searchRoots));
        var q = async.queue(function (task, cb) {
            task(cb);
        }, 2);
        q.once('drain', cb);
        var createTask = function (searchRoot) {
            return function (cb) {
                findProject(searchRoot, cb);
            };
        };
        searchRoots.forEach(function (sr) {
            q.push(createTask(sr));
        });
    },
    runUtility: function (findItems, cb) {
        if (opts.treeify) {
            return process.nextTick(cb);
        }
        Object.keys(map).filter(function (k) {
            return totalList.indexOf(k) < 0;
        }).forEach(function (k) {
            delete map[k];
        });
        var keys = Object.keys(map);
        if (!keys.length) {
            console.error(' => No deps could be found.');
            return process.exit(1);
        }
        logging_1.logGood('=> Map => \n', colors.magenta.bold(util.inspect(map)));
        function isAllLinked() {
            return Object.keys(map).every(function (k) {
                return map[k].isLinked;
            });
        }
        function getCountOfUnlinkedDeps(dep) {
            return dep.deps.filter(function (d) {
                return !map[d].isLinked;
            }).length;
        }
        function findNextDep() {
            var dep;
            var count = null;
            for (var name_1 in map) {
                if (map.hasOwnProperty(name_1)) {
                    var $dep = map[name_1];
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
                    console.log(' => Map for key ="' + d + '" is not defined.');
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
                return '&& rm -rf node_modules && npm install';
            }
        }
        function getLinkToItselfCommand(dep) {
            if (opts.self_link_all || (dep.linkToItself !== false)) {
                return "&& npm link " + dep.name;
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
            k.once('close', function (code) {
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
                        k.once('close', cb);
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
    }
}, function (err) {
    if (err) {
        console.error(err.stack || err);
        return process.exit(1);
    }
    var tree = (_a = {},
        _a[name] = {},
        _a);
    var createItem = function (key, obj, keys) {
        obj[key] = {};
        if (map[key]) {
            map[key].deps.forEach(function (d) {
                if (key !== d && keys.indexOf(d) < 0) {
                    keys.push(d);
                    var v2 = obj[key][d] = {};
                    createItem(d, v2, keys.slice(0));
                }
                else {
                    obj[key][d] = null;
                }
            });
        }
        else {
            logging_1.logWarning("no key named \"" + key + "\" in map.");
        }
    };
    originalList.forEach(function (k) {
        createItem(k, tree[name], [name]);
    });
    var line = colors.green(' => NPM-Link-Up run was successful. All done.');
    streaming_1.stdoutStrm.write(line);
    streaming_1.stdoutStrm.end();
    streaming_1.stderrStrm.end();
    console.log(line);
    console.log('\n');
    logging_1.logGood('NPM-Link-Up results as a visual:\n');
    console.log(treeify.asTree(tree, true));
    setTimeout(function () {
        process.exit(0);
    }, 100);
    var _a;
});
