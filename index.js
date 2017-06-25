#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var util = require("util");
var path = require("path");
var fs = require("fs");
var chalk = require("chalk");
var dashdash = require('dashdash');
var async = require('async');
var residence = require('residence');
var cwd = process.cwd();
var root = residence.findProjectRoot(cwd);
var treeify = require('treeify');
var streaming_1 = require("./lib/streaming");
var find_projects_1 = require("./lib/find-projects");
var map_paths_with_env_vars_1 = require("./lib/map-paths-with-env-vars");
var cache_clean_1 = require("./lib/cache-clean");
var always_ignore_1 = require("./lib/always-ignore");
var logging_1 = require("./lib/logging");
var handle_options_1 = require("./lib/handle-options");
var cmd_line_opts_1 = require("./lib/cmd-line-opts");
var run_link_1 = require("./lib/run-link");
var create_visual_tree_1 = require("./lib/create-visual-tree");
process.once('exit', function (code) {
    console.log('\n');
    logging_1.logInfo('NPM-Link-Up is exiting with code => ', code, '\n');
});
var opts, parser = dashdash.createParser({ options: cmd_line_opts_1.default });
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
        options: cmd_line_opts_1.default,
        includeHidden: true
    });
    console.log(generatedBashCode);
    process.exit(0);
}
if (!root) {
    console.error(' => NPM-Link-Up => You do not appear to be within an NPM project (no package.json could be found).\n' +
        ' => Your present working directory is =>\n' + chalk.magenta.bold(cwd));
    process.exit(1);
}
var pkg, conf;
try {
    pkg = require(path.resolve(root + '/package.json'));
}
catch (e) {
    logging_1.logError('Bizarrely, you do not seem to have a "package.json" file in the root of your project.');
    console.error('\n', e.stack || e, '\n');
    process.exit(1);
}
try {
    conf = require(path.resolve(root + '/npm-link-up.json'));
}
catch (e) {
    logging_1.logError('You do not have an "npm-link-up.json" file in the root of your project. ' +
        'You need this config file for npmlinkup to do it\'s thing.');
    console.error('\n', e.stack || e, '\n');
    process.exit(1);
}
var NLU = require('./schemas/npm-link-up-schema');
new NLU(conf, false).validate();
var name = pkg.name;
if (!name) {
    console.error(' => Ummmm, your package.json file does not have a name property. Fatal.');
    process.exit(1);
}
console.log('\n');
logging_1.logGood("We are running the npm-link-up tool for your project named \"" + chalk.magenta(name) + "\".");
var deps = Object.keys(pkg.dependencies || {})
    .concat(Object.keys(pkg.devDependencies || {}))
    .concat(Object.keys(pkg.optionalDependencies || {}));
var list = conf.list;
if (list.length < 1) {
    console.error('\n', chalk.magenta(' => You do not have any dependencies listed in your npm-link-up.json file.'));
    console.log('\n\n', chalk.cyan.bold(util.inspect(conf)));
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
var ignore = handle_options_1.getIgnore(conf, always_ignore_1.default);
console.log('\n');
originalList.forEach(function (item) {
    logging_1.logGood("The following dep will be 'NPM linked' to this project => \"" + item + "\".");
});
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
    mapSearchRoots: function (npmCacheClean, cb) {
        map_paths_with_env_vars_1.mapPaths(searchRoots, cb);
    },
    findItems: function (mapSearchRoots, cb) {
        var searchRoots = mapSearchRoots.slice(0);
        console.log('\n');
        logging_1.logInfo('Initially, NPM-Link-Up will be searching these roots for relevant projects => \n', chalk.magenta(util.inspect(searchRoots)));
        if (opts.verbosity > 1) {
            console.log('\n');
            logging_1.logWarning('Note however that NPM-Link-Up may come across a project of yours that needs to search in directories not covered by\n' +
                'your original search roots, and these new directories will be searched as well.');
        }
        console.log('\n');
        var q = async.queue(function (task, cb) {
            task(cb);
        }, 2);
        var findProject = find_projects_1.makeFindProject(q, totalList, map, ignore, opts);
        var callable = true;
        q.drain = function () {
            if (callable) {
                callable = false;
                cb(null, {
                    actuallyRan: true
                });
            }
        };
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
        run_link_1.runNPMLink(map, totalList, opts, cb);
    }
}, function (err, results) {
    if (err) {
        console.error(err.stack || err);
        return process.exit(1);
    }
    console.log('\n');
    if (results.runUtility) {
        var line = chalk.green.underline(' => NPM-Link-Up run was successful. All done.');
        streaming_1.stdoutStrm.write(line);
        streaming_1.stdoutStrm.end();
        streaming_1.stderrStrm.end();
        console.log(line);
        console.log('\n');
    }
    logging_1.logGood('NPM-Link-Up results as a visual:\n');
    var treeObj = create_visual_tree_1.createTree(map, name, originalList);
    var treeString = treeify.asTree(treeObj, true);
    var formattedStr = String(treeString).split('\n').map(function (line) {
        return '\t' + line;
    });
    console.log('^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^');
    console.log(chalk.white(formattedStr.join('\n')));
    console.log('^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^');
    setTimeout(function () {
        process.exit(0);
    }, 100);
});
