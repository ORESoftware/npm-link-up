#!/usr/bin/env node

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
const colors = require('colors/safe');
const async = require('async');
const residence = require('residence');
const cwd = process.cwd();
const root = residence.findProjectRoot(cwd);
const treeify = require('treeify');
import  {stdoutStrm, stderrStrm} from './lib/streaming';

//project
import {makeFindProject} from './lib/find-projects';
import {mapPaths} from './lib/map-paths-with-env-vars';
import {cleanCache} from './lib/cache-clean';
import alwaysIgnoreThese  from './lib/always-ignore';
import {logInfo, logError, logWarning, logVeryGood, logGood} from './lib/logging';
import {getIgnore} from "./lib/handle-options";
import options from './lib/cmd-line-opts';
import {runNPMLink} from './lib/run-link';

//////////////////////////////////////////////////////////////////////////

process.once('exit', function (code) {
  console.log('\n\n => NPM-Link-Up is exiting with code => ', code, '\n');
});

//////////////////////////////////////////////////////////////

export interface INPMLinkUpOpts {
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

////////////////////////////////////////////////////////////////////

let opts: INPMLinkUpOpts, parser = dashdash.createParser({options: options});

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
    ' => Your present working directory is =>\n' + colors.magenta.bold(cwd));
  process.exit(1);
}

const isTreeify = opts.treeify;

export interface INPMLinkUpVisualTree {
  [key: string]: INPMLinkUpVisualTree
}

let pkg, conf;

try {
  pkg = require(path.resolve(root + '/package.json'));
}
catch (e) {
  logError('Bizarrely, you do not seem to have a "package.json" file in the root of your project.');
  console.error('\n', e.stack || e, '\n');
  process.exit(1);
}

try {
  conf = require(path.resolve(root + '/npm-link-up.json'));
}
catch (e) {
  logError('You do not have an "npm-link-up.json" file in the root of your project. ' +
    'You need this config file for npmlinkup to do it\'s thing.');
  console.error('\n', e.stack || e, '\n');
  process.exit(1);
}

const NLU = require('./schemas/npm-link-up-schema');
new NLU(conf, false).validate();

const name = pkg.name;

if (!name) {
  console.error(' => Ummmm, your package.json file does not have a name property. Fatal.');
  process.exit(1);
}

const deps = Object.keys(pkg.dependencies || {})
  .concat(Object.keys(pkg.devDependencies || {}))
  .concat(Object.keys(pkg.optionalDependencies || {}));

let list = conf.list;

if (list.length < 1) {
  console.error('\n', colors.magenta(' => You do not have any dependencies listed in your npm-link-up.json file.'));
  console.log('\n\n', colors.cyan.bold(util.inspect(conf)));
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
  logWarning('warning, the following item was listed in your npm-link-up.json file,\n' +
    'but is not listed in your package.json dependencies => "' + item + '".');
});

// we need to store a version of the list without the top level package's name
const originalList = list.slice(0);

// always push the very project's name
list.push(name);

list = list.filter(function (item: string, index: number) {
  return list.indexOf(item) === index;
});

const totalList: Array<string> = list.slice(0);
const ignore = getIgnore(conf, alwaysIgnoreThese);
console.log('\n');

originalList.forEach(function (item: string) {
  logGood(`The following dep will be NPM link\'ed to this project => "${item}".`);
});

console.log('\n');

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

    searchRoots: function (npmCacheClean: any, cb: Function) {
      mapPaths(searchRoots, cb);
    },

    findItems: function (searchRoots: Array<string>, cb: Function) {

      console.log('\n');
      logInfo('Searching these roots => \n', colors.magenta(searchRoots));

      const q = async.queue(function (task: Function, cb: Function) {
        task(cb);
      }, 2);

      const findProject = makeFindProject(q, totalList, map, ignore, opts);

      let callable = true;
      q.drain = function () {
        if (callable) {
          callable = false;
          cb();
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

      if (opts.treeify) {
        return process.nextTick(cb);
      }

      runNPMLink(map, totalList, opts, cb);

    }
  },

  function (err: Error) {

    if (err) {
      console.error(err.stack || err);
      return process.exit(1);
    }

    // console.log(util.inspect(map));

    let tree: INPMLinkUpVisualTree = {
      [name]: {}
    };

    let createItem = function (key: string, obj: INPMLinkUpVisualTree, keys: Array<string>) {

      obj[key] = {};

      if (map[key]) {
        map[key].deps.forEach(function (d: string) {

          if (key !== d && keys.indexOf(d) < 0) {
            keys.push(d);
            let v2 = obj[key][d] = {};
            createItem(d, v2, keys.slice(0));
          }
          else {
            // keys.push(d);
            obj[key][d] = null;
          }

        });
      }
      else {
        logWarning(`no key named "${key}" in map.`);
      }

    };

    originalList.forEach(function (k: string) {
      createItem(k, tree[name], [name]);
    });

    const line = colors.green(' => NPM-Link-Up run was successful. All done.');
    stdoutStrm.write(line);
    stdoutStrm.end();
    stderrStrm.end();
    console.log(line);

    console.log('\n');
    logGood('NPM-Link-Up results as a visual:\n');
    console.log(treeify.asTree(tree, true));

    setTimeout(function () {
      process.exit(0);
    }, 100);

  });








