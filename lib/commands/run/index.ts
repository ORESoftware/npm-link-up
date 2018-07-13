#!/usr/bin/env node
'use strict';

//core
import * as util from 'util';
import * as assert from 'assert';
import * as path from 'path';
import * as cp from 'child_process';
import * as fs from 'fs';

//npm
import chalk from 'chalk';
const dashdash = require('dashdash');
import async = require('async');
import residence = require('residence');
const cwd = process.cwd();
const root = residence.findProjectRoot(cwd);
const treeify = require('treeify');
import mkdirp = require('mkdirp');

//project
import {makeFindProject} from '../../find-projects';
import {mapPaths} from '../../map-paths-with-env-vars';
import {cleanCache} from '../../cache-clean';
import log from '../../logging';
import {getIgnore, getSearchRoots} from "../../handle-options";
import options from './cmd-line-opts';
import {runNPMLink} from '../../run-link';
import {createTree} from '../../create-visual-tree';
import {getCleanMap} from '../../get-clean-final-map';
import {q} from '../../search-queue';
const npmLinkUpPkg = require('../../../package.json');
import {EVCb, NluMap, NLURunOpts} from "../../npmlinkup";
import {
  globalConfigFilePath,
  determineIfReinstallIsNeeded,
  getDevKeys,
  getProdKeys,
  validateConfigFile,
  validateOptions
} from "../../utils";
import {NluGlobalSettingsConf} from "../config";

//////////////////////////////////////////////////////////////////////////

process.once('exit', function (code) {
  log.info('NLU is exiting with code:', code, '\n');
});

//////////////////////////////////////////////////////////////

let opts: NLURunOpts, globalConf: NluGlobalSettingsConf, parser = dashdash.createParser({options});

try {
  opts = parser.parse(process.argv);
} catch (e) {
  log.error(chalk.magenta(' => CLI parsing error:'), chalk.magentaBright.bold(e.message));
  process.exit(1);
}

if (opts.help) {
  let help = parser.help({includeEnv: true}).trimRight();
  console.log('usage: nlu run [OPTIONS]\n'
    + 'options:\n'
    + help);
  process.exit(0);
}

try{
  globalConf = require(globalConfigFilePath);
}
catch(err){
  log.warn('Could not load global config');
  globalConf = {};
}

if(!(globalConf && typeof globalConf === 'object')){
  globalConf = {};
}

if(Array.isArray(globalConf)){
  globalConf = {};
}

opts = Object.assign({}, globalConf, opts);


if (!root) {
  log.error('You do not appear to be within an NPM project (no package.json could be found).');
  log.error(' => Your present working directory is =>', chalk.magenta.bold(cwd));
  process.exit(1);
}

let pkg, conf;

try {
  pkg = require(path.resolve(root + '/package.json'));
}
catch (e) {
  log.error('Bizarrely, you do not seem to have a "package.json" file in the root of your project.');
  log.error('Your project root is supposedly here:', chalk.magenta(root));
  log.error(e.message);
  process.exit(1);
}

try {
  conf = require(path.resolve(root + '/.nlu.json'));
}
catch (e) {
  log.error('You do not have an ".nlu.json" file in the root of your project. ' +
    'You need this config file for npmlinkup to do its thing.');
  log.error('Your project root is supposedly here:', chalk.magenta(root));
  log.error(e.message);
  process.exit(1);
}

if (!validateOptions(opts)) {
  log.error(chalk.bold('Your command line arguments were invalid, try:', chalk.magentaBright('nlu run --help')));
  process.exit(1);
}

if (!validateConfigFile(conf)) {
  log.error('Your .nlu.json config file appears to be invalid. To override this, use --override.');
  if (!opts.override) {
    process.exit(1);
  }
}

const mainProjectName = pkg.name;

if (!mainProjectName) {
  log.error('Ummmm, your package.json file does not have a name property. Fatal.');
  process.exit(1);
}
if (opts.verbosity > 0) {
  log.good(`We are running the "npm-link-up" tool for your project named "${chalk.magenta(mainProjectName)}".`);
}


const productionDepsKeys = getProdKeys(pkg);
const allDepsKeys = getDevKeys(pkg);

let list = conf.list;

assert(Array.isArray(list),
  'Your .nlu.json file must have a top-level "list" property that is an array of strings.');

list = list.filter(function (item: string) {
  return !/###/.test(item);
});

if (list.length < 1) {
  log.error(chalk.magenta(' => You do not have any dependencies listed in your .nlu.json file.'));
  log.error(chalk.cyan.bold(util.inspect(conf)));
  process.exit(1);
}

const searchRoots = getSearchRoots(opts, conf);

if(searchRoots.length < 1){
  log.error(chalk.red('No search-roots provided.'));
  log.error('You should either update your .nlu.json config to have a searchRoots array.');
  log.error('Or you can use the --search-root=X option at the command line.');
  log.error(chalk.bold('Conveniently, you may include environment variables in your search root strings.'));
  log.error('For example, to search everything starting from $HOME, you can use --search-root=$HOME option at the command line.');
  log.error('However, it is highly recommended to choose a subdirectory from $HOME, since searching that many files can take some time.');
  process.exit(1);
}

const inListButNotInDeps: Array<string> = list.filter((item: string) => {
  return !allDepsKeys.includes(item);
});

inListButNotInDeps.forEach(function (item) {
  if (opts.verbosity > 1) {
    log.warning('warning, the following item was listed in your .nlu.json file, ' +
      'but is not listed in your package.json dependencies => "' + item + '".');
  }
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

const ignore = getIgnore(conf, opts);

originalList.forEach(function (item: string) {
  if (opts.verbosity > 0) {
    log.good(`The following dep will be linked to this project => "${chalk.gray.bold(item)}".`);
  }
});

const map: NluMap = {};
let cleanMap: NluMap;

if (opts.dry_run) {
  log.warning(chalk.bold.gray('Because --dry-run was used, we are not actually linking projects together.'));
}

// add the main project to the map
// when we search for projects, we ignore any projects where package.json name is "mainProjectName"
map[mainProjectName] = {
  name: mainProjectName,
  bin: conf.bin || null,
  isMainProject: true,
  linkToItself: conf.linkToItself,
  runInstall: conf.alwaysReinstall,
  path: root,
  deps: conf.list
};

async.autoInject({

    readNodeModulesFolders(cb: EVCb<any>) {

      const nm = path.resolve(root + '/node_modules');
      const keys = opts.production ? productionDepsKeys: allDepsKeys;

      determineIfReinstallIsNeeded(nm, keys, opts, (err, val) =>{

        if(err){
          return cb(err);
        }

        if(val === true){
          opts.install_main = true;
        }

        cb(null);

      });


    },

    ensureNodeModules(readNodeModulesFolders: any, cb: EVCb<any>) {

      if (!readNodeModulesFolders) {
        // no error reading node_modules dir
        return process.nextTick(cb);
      }

      opts.install_main = true;
      // we have to install, because node_modules does not exist
      mkdirp(path.resolve(root + '/node_modules'), cb);
    },

    npmCacheClean(cb: EVCb<any>) {

      if (opts.dry_run) {
        return process.nextTick(cb);
      }

      if (!opts.clear_all_caches) {
        return process.nextTick(cb);
      }

      log.info(`Cleaning the NPM cache.`);
      cleanCache(cb);
    },

    mapSearchRoots(npmCacheClean: any, cb: EVCb<any>) {
      opts.verbosity > 3 && log.info(`Mapping original search roots from your root project's "searchRoots" property.`);
      mapPaths(searchRoots, cb);
    },

    findItems(mapSearchRoots: Array<string>, cb: EVCb<any>) {

      let searchRoots = mapSearchRoots.slice(0);

      if (opts.verbosity > 1) {
        log.info('Beginning to search for NPM projects on your filesystem.');
      }

      if (opts.verbosity > 3) {
        log.info('NPM-Link-Up will be searching these roots for relevant projects:');
        log.info(chalk.magenta(util.inspect(searchRoots)));
      }

      if (opts.verbosity > 2) {
        log.warning('Note that NPM-Link-Up may come across a project of yours that needs to search in directories');
        log.warning('not covered by your original search roots, and these new directories will be searched as well.');
      }

      const status = {searching: true};
      const findProject = makeFindProject(mainProjectName, totalList, map, ignore, opts, status);

      searchRoots.forEach(function (sr) {
        q.push(function (cb) {
          findProject(sr, cb);
        });
      });

      if (q.idle()) {
        return process.nextTick(cb, new Error('For some reason, no paths/items went onto the search queue.'));
      }

      let first = true;

      q.error = q.drain = function (err?: any) {

        if (err) {
          status.searching = false;
          log.error(chalk.magenta('There was a search queue processing error.'));
        }

        if (first) {
          q.kill();
          cb(err, {actuallyRan: true});
        }

        first = false;
      };

    },

    runUtility(findItems: void, cb: EVCb<any>) {

      try {
        cleanMap = getCleanMap(mainProjectName, map);
      }
      catch (err) {
        return process.nextTick(cb, err);
      }

      if (opts.dry_run) {
        return process.nextTick(cb);
      }

      log.good('Beginning to actually link projects together...');
      runNPMLink(cleanMap, opts, cb);
    }
  },

  function (err: any, results: object) {

    if (err) {
      log.error(err.stack || err);
      return process.exit(1);
    }

    if ((results as any).runUtility) {
      // if runUtility is defined on results, then we actually ran the tool
      log.good(chalk.green.underline('NPM-Link-Up run was successful. All done.'));
    }

    const treeObj = createTree(cleanMap, mainProjectName, originalList, opts);
    const treeString = treeify.asTree(treeObj, true);
    const formattedStr = String(treeString).split('\n').map(function (line) {
      return '\t' + line;
    });

    if (opts.verbosity > 1) {
      log.good(chalk.cyan.bold('NPM-Link-Up results as a visual:'), '\n');
      console.log('^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^');
      console.log(chalk.white(formattedStr.join('\n')));
      console.log('^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^');
    }

    setTimeout(function () {
      process.exit(0);
    }, 100);

  });








