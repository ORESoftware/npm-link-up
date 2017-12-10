#!/usr/bin/env node
'use strict';

//core
import * as util from 'util';
import * as assert from 'assert';
import * as path from 'path';
import * as EE from 'events';
import * as fs from 'fs';
import * as stream from 'stream';
import * as cp from 'child_process';

//npm
import * as chalk from 'chalk';
const dashdash = require('dashdash');
const async = require('async');
const residence = require('residence');
const cwd = process.cwd();
const root = residence.findProjectRoot(cwd);
const treeify = require('treeify');
import {stdoutStrm, stderrStrm} from './lib/streaming';

//project
import {makeFindProject} from './lib/find-projects';
import {mapPaths} from './lib/map-paths-with-env-vars';
import {cleanCache} from './lib/cache-clean';
import alwaysIgnoreThese from './lib/always-ignore';
import {log} from './lib/logging';
import {getIgnore} from "./lib/handle-options";
import options from './lib/cmd-line-opts';
import {runNPMLink} from './lib/run-link';
import {createTree} from './lib/create-visual-tree';

//////////////////////////////////////////////////////////////////////////

process.once('exit', function (code) {
  console.log('\n');
  log.info('NPM-Link-Up is exiting with code => ', code, '\n');
});

//////////////////////////////////////////////////////////////

export interface INPMLinkUpConf {
  alwaysReinstall: boolean,
  linkToItself: boolean,
  searchRoots: Array<string>,
  ignore: Array<string>,
  list: Array<string>
}

export interface INPMLinkUpOpts {
  search_root: Array<string>,
  clear_all_caches: boolean,
  verbosity: number,
  version: string,
  help: boolean,
  completion: boolean,
  install_all: boolean,
  self_link_all: boolean,
  treeify: boolean
}

export interface INPMLinkUpMapItem {
  name: string,
  hasNPMLinkUpJSONFile: boolean,
  linkToItself: boolean,
  runInstall: boolean,
  hasAtLinkSh: boolean,
  path: string,
  deps: Array<string>
  isLinked?: boolean
}

export interface INPMLinkUpMap {
  [key: string]: INPMLinkUpMapItem
}

export interface INPMLinkUpVisualTree {
  [key: string]: INPMLinkUpVisualTree
}

////////////////////////////////////////////////////////////////////

let opts: INPMLinkUpOpts, parser = dashdash.createParser({options});

try {
  opts = parser.parse(process.argv);
} catch (e) {
  console.error(' => CLI parsing error: %s', e.message);
  process.exit(1);
}

if (opts.version) {
  let npmLinkUpPkg = require('./package.json');
  console.log(npmLinkUpPkg.version);
  process.exit(0);
}

if (opts.help) {
  let help = parser.help({includeEnv: true}).trimRight();
  console.log('usage: node foo.js [OPTIONS]\n'
    + 'options:\n'
    + help);
  process.exit(0);
}

if (opts.completion) {
  let generatedBashCode = dashdash.bashCompletionFromOptions({
    name: 'npmlinkup',
    options: options,
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

let pkg, conf;

try {
  pkg = require(path.resolve(root + '/package.json'));
}
catch (e) {
  log.error('Bizarrely, you do not seem to have a "package.json" file in the root of your project.');
  console.error('\n', e.stack || e, '\n');
  process.exit(1);
}

try {
  conf = require(path.resolve(root + '/npm-link-up.json'));
}
catch (e) {
  log.error('You do not have an "npm-link-up.json" file in the root of your project. ' +
    'You need this config file for npmlinkup to do it\'s thing.');
  console.error('\n', e.stack || e, '\n');
  process.exit(1);
}

import NLU = require('./lib/npm-link-up-schema');
new NLU(conf, false).validate();

const name = pkg.name;

if (!name) {
  console.error(' => Ummmm, your package.json file does not have a name property. Fatal.');
  process.exit(1);
}

console.log();
log.good(`We are running the npm-link-up tool for your project named "${chalk.magenta(name)}".`);

const deps = Object.keys(pkg.dependencies || {})
.concat(Object.keys(pkg.devDependencies || {}))
.concat(Object.keys(pkg.optionalDependencies || {}));

let list = conf.list;

assert(Array.isArray(list),
  ' => Your npm-link-up.json file must have a top-level list property that is an array of strings.');

list = list.filter(function (item: string) {
  return !/###/.test(item);
});

if (list.length < 1) {
  console.error('\n', chalk.magenta(' => You do not have any dependencies listed in your npm-link-up.json file.'));
  console.log('\n\n', chalk.cyan.bold(util.inspect(conf)));
  process.exit(1);
}

let searchRoots: Array<string>;

if (opts.search_root && opts.search_root.length > 0) {
  searchRoots = opts.search_root.filter(function (item: string, i: number, arr: Array<string>) {
    return arr.indexOf(item) === i;  // get a unique list
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
  .filter(function (item: string, i: number, arr: Array<string>) {
    return arr.indexOf(item) === i;  // get a unique list
  });
}

const inListButNotInDeps: Array<string> = [];
const inListAndInDeps = list.filter(function (item: string) {
  if (!deps.includes(item)) {
    inListButNotInDeps.push(item);
    return false;
  }
  return true;
});

inListButNotInDeps.forEach(function (item) {
  log.warning('warning, the following item was listed in your npm-link-up.json file, ' +
    'but is not listed in your package.json dependencies => "' + item + '".');
});

// we need to store a version of the list without the top level package's name
const originalList = list.slice(0);

// always push the very project's name
list.push(name);

list = list.filter(function (item: string, index: number) {
  return list.indexOf(item) === index;
});

const totalList = new Map();

list.forEach(function(l: string){
  totalList.set(l,true);
});


const ignore = getIgnore(conf, alwaysIgnoreThese);
console.log('\n');

originalList.forEach(function (item: string) {
  log.good(`The following dep will be 'NPM linked' to this project => "${item}".`);
});

if (opts.inherit_log) {
  stdoutStrm.pipe(process.stdout);
  stderrStrm.pipe(process.stderr);
}

if (opts.log) {
  stdoutStrm.pipe(fs.createWriteStream(path.resolve(root + '/npm-link-up.log')));
  stderrStrm.pipe(fs.createWriteStream(path.resolve(root + '/npm-link-up.log')));
}

const map: INPMLinkUpMap = {};

async.autoInject({

    npmCacheClean: function (cb: Function) {

      if (!opts.clear_all_caches) {
        return process.nextTick(cb);
      }

      cleanCache(cb);
    },

    rimrafMainProject: function (cb: Function) {
      let nm = path.resolve(root + '/node_modules');
      cp.exec(`cd ${root} && rm -rf ${nm}`, function (err, stdout, stderr) {
        err && console.error(err.stack || err);
        (stderr = String(stderr).trim()) && console.error(stderr);
        cb(null);
      });
    },

    mapSearchRoots: function (npmCacheClean: any, cb: Function) {
      mapPaths(searchRoots, cb);
    },

    findItems: function (rimrafMainProject: any, mapSearchRoots: Array<string>, cb: Function) {

      let searchRoots = mapSearchRoots.slice(0);

      console.log('\n');
      log.info('Initially, NPM-Link-Up will be searching these roots for relevant projects => \n', chalk.magenta(util.inspect(searchRoots)));
      if (opts.verbosity > 1) {
        console.log('\n');
        log.warning('Note however that NPM-Link-Up may come across a project of yours that needs to search in directories not covered by\n' +
          'your original search roots, and these new directories will be searched as well.');
      }

      console.log('\n');

      const q = async.queue(function (task: Function, cb: Function) {
        task(cb);
      }, 2);

      const findProject = makeFindProject(q, totalList, map, ignore, opts);

      let callable = true;
      q.drain = function () {
        if (callable) {
          callable = false;
          cb(null, {actuallyRan: true});
        }
      };

      const createTask = function (searchRoot: string) {
        return function (cb: Function) {
          findProject(searchRoot, cb);
        }
      };

      searchRoots.forEach(function (sr) {
        q.push(createTask(sr));
      });

    },

    runUtility: function (findItems: void, cb: Function) {
      runNPMLink(map, totalList, opts, cb);
    }
  },

  function (err: Error, results: Object) {

    if (err) {
      console.error(err.stack || err);
      return process.exit(1);
    }

    console.log('\n');

    if (results.runUtility) {
      // if runUtility is defined on results, then we actually ran the tool
      const line = chalk.green.underline(' => NPM-Link-Up run was successful. All done.');
      stdoutStrm.write(line);
      stdoutStrm.end();
      stderrStrm.end();
      console.log(line);
      console.log('\n');
    }

    log.good('NPM-Link-Up results as a visual:\n');
    const treeObj = createTree(map, name, originalList);
    const treeString = treeify.asTree(treeObj, true);
    const formattedStr = String(treeString).split('\n').map(function (line) {
      return '\t' + line;
    });
    console.log('^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^');
    console.log(chalk.white(formattedStr.join('\n')));
    console.log('^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^');

    setTimeout(function () {
      process.exit(0);
    }, 100);

  });








