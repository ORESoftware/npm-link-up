#!/usr/bin/env node
'use strict';

//core
import * as util from 'util';
import * as assert from 'assert';
import * as path from 'path';
import * as cp from 'child_process';

//npm
import chalk from 'chalk';
const dashdash = require('dashdash');
const async = require('async');
const residence = require('residence');
const cwd = process.cwd();
const root = residence.findProjectRoot(cwd);
const treeify = require('treeify');

//project
import {makeFindProject, createTask} from './find-projects';
import {mapPaths} from './map-paths-with-env-vars';
import {cleanCache} from './cache-clean';
import log from './logging';
import {getIgnore, getSearchRoots} from "./handle-options";
import options from './cmd-line-opts';
import {runNPMLink} from './run-link';
import {createTree} from './create-visual-tree';
import {getCleanMap} from './get-clean-final-map';
import {q} from './search-queue';

//////////////////////////////////////////////////////////////////////////

process.once('exit', function (code) {
  console.log('\n');
  log.info('NPM-Link-Up is exiting with code => ', code, '\n');
});

//////////////////////////////////////////////////////////////

let opts: NPMLinkUpOpts, parser = dashdash.createParser({options});

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

import NLU = require('./npm-link-up-schema');
import {ErrorFirstCallback, NPMLinkUpMap, NPMLinkUpOpts} from "./npmlinkup";
new NLU(conf, false).validate();

const mainProjectName = pkg.name;

if (!mainProjectName) {
  log.error('Ummmm, your package.json file does not have a name property. Fatal.');
  process.exit(1);
}

console.log();
log.good(`We are running the "npm-link-up" tool for your project named "${chalk.magenta(mainProjectName)}".`);

const deps = Object.keys(pkg.dependencies || {})
.concat(Object.keys(pkg.devDependencies || {}))
.concat(Object.keys(pkg.optionalDependencies || {}));

let list = conf.list;

assert(Array.isArray(list),
  'Your npm-link-up.json file must have a top-level "list" property that is an array of strings.');

list = list.filter(function (item: string) {
  return !/###/.test(item);
});

if (list.length < 1) {
  console.error('\n', chalk.magenta(' => You do not have any dependencies listed in your npm-link-up.json file.'));
  console.log('\n\n', chalk.cyan.bold(util.inspect(conf)));
  process.exit(1);
}

const searchRoots = getSearchRoots(opts, conf);
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
list.push(mainProjectName);

list = list.filter(function (item: string, index: number) {
  return list.indexOf(item) === index;
});

const totalList = new Map();

list.forEach(function (l: string) {
  totalList.set(l, true);
});

const ignore = getIgnore(conf);
console.log('\n');

originalList.forEach(function (item: string) {
  log.good(`The following dep will be 'NPM linked' to this project => "${item}".`);
});


const map: NPMLinkUpMap = {};
let cleanMap: NPMLinkUpMap;

if (opts.treeify) {
  log.warning('We are only printing a visual, not actually linking project.');
}

async.autoInject({
    
    npmCacheClean: function (cb: Function) {
      
      if (opts.treeify) {
        return process.nextTick(cb);
      }
      
      if (!opts.clear_all_caches) {
        return process.nextTick(cb);
      }
      
      log.info(`Cleaning the NPM cache.`);
      cleanCache(cb);
    },
    
    rimrafMainProject: function (cb: Function) {
      
      if (opts.treeify) {
        return process.nextTick(cb);
      }

      if(true){
        return process.nextTick(cb);
      }
      
      log.info(`Deleting node_modules from your root project.`);

      let nm = path.resolve(root + '/node_modules');
      cp.exec(`cd ${root} && rm -rf ${nm}`, function (err, stdout, stderr) {
        err && console.error(err.stack || err);
        (stderr = String(stderr).trim()) && console.error(stderr);
        cb(null);
      });
    },
    
    mapSearchRoots: function (npmCacheClean: any, cb: Function) {
      log.info(`Mapping original search roots from your root project's "searchRoots" property.`);
      mapPaths(searchRoots, cb);
    },
    
    findItems: function (rimrafMainProject: any, mapSearchRoots: Array<string>, cb: Function) {
      
      let searchRoots = mapSearchRoots.slice(0);
      
      console.log('\n');
      log.info('Beginning to search for NPM projects on your filesystem.');
      log.info('NPM-Link-Up will be searching these roots for relevant projects:');
      log.info(chalk.magenta(util.inspect(searchRoots)));
      
      if (opts.verbosity > 1) {
        log.warning('Note that NPM-Link-Up may come across a project of yours that needs to search in directories');
        log.warning('not covered by your original search roots, and these new directories will be searched as well.');
      }
      
      console.log('\n');
      const findProject = makeFindProject(mainProjectName, totalList, map, ignore, opts);
      
      let callable = true;
      q.drain = function () {
        if (callable) {
          callable = false;
          cb(null, {actuallyRan: true});
        }
      };
      
      searchRoots.forEach(function (sr) {
        q.push(createTask(sr, findProject));
      });
      
    },
    
    runUtility: function (findItems: void, cb: ErrorFirstCallback) {
      
      cleanMap = getCleanMap(mainProjectName, map);
      
      if (opts.treeify) {
        return process.nextTick(cb);
      }
  
      console.log('\n');
      log.good('Beginning to actually link projects together...');
      runNPMLink(cleanMap, totalList, opts, cb);
    }
  },
  
  function (err: Error, results: Object) {
    
    if (err) {
      log.error(err.stack || err);
      return process.exit(1);
    }
    
    console.log('\n');
    
    if ((results as any).runUtility) {
      // if runUtility is defined on results, then we actually ran the tool
      log.good(chalk.green.underline('NPM-Link-Up run was successful. All done.'));
      console.log('\n');
    }
    
    log.good('NPM-Link-Up results as a visual:\n');
    const treeObj = createTree(cleanMap, mainProjectName, originalList, opts);
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








