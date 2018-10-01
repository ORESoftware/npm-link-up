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
let root = residence.findProjectRoot(cwd);
const treeify = require('treeify');
import mkdirp = require('mkdirp');

//project
import {makeFindProject, rootPaths} from '../../find-projects';
import {mapPaths} from '../../map-paths';
import {cleanCache} from '../../cache-clean';
import log from '../../logging';
import {getIgnore, getSearchRoots} from "../../handle-options";
import options, {NLURunOpts} from './cmd-line-opts';
import {runNPMLink} from '../../run-link';
import {createTree} from '../../create-visual-tree';
import {getCleanMap, getCleanMapOfOnlyPackagesWithNluJSONFiles} from '../../get-clean-final-map';
import {q} from '../../search-queue';
import {EVCb, NluConf, NluMap} from "../../index";

import {
  globalConfigFilePath,
  determineIfReinstallIsNeeded,
  getDevKeys,
  getProdKeys,
  validateConfigFile,
  validateOptions, mapConfigObject, getDepsListFromNluJSON
} from "../../utils";

import {NluGlobalSettingsConf} from "../../index";

//////////////////////////////////////////////////////////////////////////

process.once('exit', function (code) {
  if (code !== 0) {
    log.warn('NLU is exiting with code:', code, '\n');
  }
  else {
    log.info('NLU is exiting with code:', code, '\n');
  }
});

//////////////////////////////////////////////////////////////

const allowUnknown = process.argv.indexOf('--allow-unknown') > 0;
let opts: NLURunOpts, globalConf: NluGlobalSettingsConf, parser = dashdash.createParser({options, allowUnknown});

try {
  opts = parser.parse(process.argv);
} catch (e) {
  log.error(chalk.magenta('CLI parsing error:'), chalk.magentaBright.bold(e.message));
  process.exit(1);
}

if (opts.help) {
  let help = parser.help({includeEnv: true}).trimRight();
  console.log('usage: nlu run [OPTIONS]\n'
    + 'options:\n'
    + help);
  process.exit(0);
}

opts.config = path.resolve(String(opts.config || '').replace(/\.nlu\.json$/, ''));

try {
  if (opts.config) {
    assert(fs.statSync(opts.config).isDirectory(), 'config path is not a directory.');
  }
}
catch (err) {
  log.error('You declared a config path but the following path is not a directory:', opts.config);
  throw chalk.magenta(err.message);
}

opts.config = path.resolve(String(opts.config || '').replace(/\.nlu\.json$/, ''));

try {
  if (opts.config) {
    assert(fs.statSync(opts.config).isDirectory(), 'config path is not a directory.');
  }
}
catch (err) {
  log.error('You declared a config path but the following path is not a directory:', opts.config);
  throw chalk.magenta(err.message);
}

try {
  globalConf = require(globalConfigFilePath);
}
catch (err) {
  log.warn('Could not load global config');
  globalConf = {};
}

if (!(globalConf && typeof globalConf === 'object')) {
  globalConf = {};
}

if (Array.isArray(globalConf)) {
  globalConf = {};
}

let nluConfigRoot: string = null;

if (opts.config) {
  nluConfigRoot = path.resolve(opts.config);
}
else {
  nluConfigRoot = residence.findRootDir(cwd, '.nlu.json');
}

if (!nluConfigRoot) {
  nluConfigRoot = cwd;
}

let pkg, conf: NluConf;

let hasNLUJSONFile = false;
const nluFilePath = path.resolve(nluConfigRoot + '/.nlu.json');

try {
  conf = require(nluFilePath);
  opts.umbrella = opts.umbrella || Boolean(conf.umbrella);
  hasNLUJSONFile = true;
}
catch (e) {
  if (!opts.umbrella) {
    log.error('Could not load your .nlu.json file at this path:', chalk.bold(nluFilePath));
    log.error('Your project root is supposedly here:', chalk.bold(root));
    log.error(chalk.magentaBright(e.message));
    process.exit(1);
  }
  opts.all_packages = true;
  conf = <NluConf>{
    'npm-link-up': true,
    linkable: false,
    searchRoots: ['.'],
    list: []
  }
}

if (!root) {
  if (!opts.umbrella) {
    log.error('You do not appear to be within an NPM project (no package.json could be found).');
    log.error(' => Your present working directory is =>', chalk.magenta.bold(cwd));
    process.exit(1);
  }
  root = cwd;
}

try {
  pkg = require(path.resolve(root + '/package.json'));
}
catch (e) {

  if (!opts.umbrella) {
    log.error('Bizarrely, you do not seem to have a "package.json" file in the root of your project.');
    log.error('Your project root is supposedly here:', chalk.magenta(root));
    log.error(e.message);
    process.exit(1);
  }

  pkg = {
    name: '(root)'  // (dummy-root-package)
  };

}

if (Array.isArray(conf.packages)) {
  throw chalk.magenta(`"packages" property should be an object but no an array => ${util.inspect(conf)}`);
}

if ('packages' in conf) {
  assert.strictEqual(typeof conf.packages, 'object', `packages" property should be an object => ${util.inspect(conf)}`)
}

conf.packages = conf.packages || {};
conf.localSettings = conf.localSettings || {};

if (!(conf.localSettings && typeof conf.localSettings === 'object')) {
  conf.localSettings = {}
}

if (Array.isArray(conf.localSettings)) {
  conf.localSettings = {};
}

opts = Object.assign({},
  mapConfigObject(globalConf),
  mapConfigObject(conf.localSettings),
  opts
);

if (!validateOptions(opts)) {
  log.error(chalk.bold('Your command line arguments were invalid, try:', chalk.magentaBright('nlu run --help')));
  process.exit(1);
}

if (!validateConfigFile(conf)) {
  console.error();
  if (!opts.override) {
    log.error(chalk.redBright('Your .nlu.json config file appears to be invalid. To override this, use --override.'));
    process.exit(1);
  }
}

const mainProjectName = pkg.name;

if (!mainProjectName) {
  log.error('Ummmm, your package.json file does not have a name property. Fatal.');
  process.exit(1);
}

if (opts.verbosity > 0) {
  log.info(`We are running the "npm-link-up" tool for your project named "${chalk.magenta(mainProjectName)}".`);
}

const productionDepsKeys = getProdKeys(pkg);
const allDepsKeys = getDevKeys(pkg);
const list = getDepsListFromNluJSON(conf);

if (list.length < 1) {
  if (!opts.all_packages) {
    log.error(chalk.magenta(' => You do not have any dependencies listed in your .nlu.json file.'));
    log.error(chalk.cyan.bold(util.inspect(conf)));
    process.exit(1);
  }
}

const searchRoots = getSearchRoots(opts, conf);

if (searchRoots.length < 1) {
  log.error(chalk.red('No search-roots provided.'));
  log.error('You should either update your .nlu.json config to have a searchRoots array.');
  log.error('Or you can use the --search-root=X option at the command line.');
  log.error(chalk.bold('Conveniently, you may include environment variables in your search root strings.'));
  log.error('For example, to search everything starting from $HOME, you can use --search-root=$HOME option at the command line.');
  log.error('However, it is highly recommended to choose a subdirectory from $HOME, since searching that many files can take some time.');
  process.exit(1);
}

const inListButNotInDeps = list.filter(item => {
  return !allDepsKeys.includes(item);
});

inListButNotInDeps.forEach(item => {
  if (opts.verbosity > 1) {
    log.warning('warning, the following item was listed in your .nlu.json file, ' +
      'but is not listed in your package.json dependencies => "' + item + '".');
  }
});

// we need to store a version of the list without the top level package's name
const originalList = list.slice(0);

if (!list.includes(mainProjectName)) {
  // always include the very project's name
  if (!opts.umbrella) {
    list.push(mainProjectName);
  }
}

const totalList = new Map();

list.forEach(l => {
  totalList.set(l, true);
});

const ignore = getIgnore(conf, opts);

originalList.forEach((item: string) => {
  if (opts.verbosity > 0) {
    log.info(`The following dep will be linked to this project => "${chalk.gray.bold(item)}".`);
  }
});

const map: NluMap = {};

if (opts.dry_run) {
  log.warning(chalk.bold.gray('Because --dry-run was used, we are not actually linking projects together.'));
}

// add the main project to the map
// when we search for projects, we ignore any projects where package.json name is "mainProjectName"
map[mainProjectName] = {
  name: mainProjectName,
  bin: null,  // conf.bin ?
  hasNLUJSONFile,
  isMainProject: true,
  linkToItself: conf.linkToItself,
  runInstall: conf.alwaysReinstall,
  path: root,
  deps: list
};

async.autoInject({

    readNodeModulesFolders(cb: EVCb<any>) {

      const nm = path.resolve(root + '/node_modules');
      const keys = opts.production ? productionDepsKeys : allDepsKeys;

      determineIfReinstallIsNeeded(nm, keys, opts, (err, val) => {

        if (err) {
          return cb(err);
        }

        if (val === true) {
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
      mapPaths(searchRoots, nluConfigRoot, cb);
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
      const findProject = makeFindProject(mainProjectName, totalList, map, ignore, opts, status, conf);

      searchRoots.forEach(sr => {
        q.push(cb => {
          findProject(sr, cb);
        });
      });

      if (q.idle()) {
        return process.nextTick(cb, new Error('For some reason, no paths/items went onto the search queue.'));
      }

      let first = true;

      q.error = q.drain = (err?: any) => {

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

    runUtility(findItems: void, cb: EVCb<NluMap>) {

      // TODO: filter excluded and completely excluded keys

      const unfound = Array.from(totalList.keys()).filter(v => {
        return !map[v];
      });

      if (unfound.length > 0) {
        log.warn(`The following packages could ${chalk.bold('not')} be located:`);
        log.warn(unfound);
        if (!opts.allow_missing) {
          console.error();
          log.warn('The following paths (and their subdirectories) were searched:');
          rootPaths.forEach((v, i) => {
            console.info('\t\t', `${chalk.blueBright.bold(String(i + 1))}.`, chalk.blueBright(v));
          });
          console.error();
          log.error('because the --allow-missing flag was not use, we are exiting.');
          process.exit(1);
        }
      }

      let cleanMap: NluMap;

      try {

        if (opts.all_packages) {
          cleanMap = getCleanMapOfOnlyPackagesWithNluJSONFiles(mainProjectName, map);
        }
        else {
          cleanMap = getCleanMap(mainProjectName, map);
        }
      }
      catch (err) {
        return process.nextTick(cb, err);
      }

      if (opts.dry_run) {
        return process.nextTick(() => {
          cb(null, cleanMap);
        });
      }

      log.info('Beginning to actually link projects together...');
      runNPMLink(cleanMap, opts, err => {
        cb(err, cleanMap);
      });
    }
  },

  (err: any, results: any) => {

    if (err) {
      log.error('There was an error while running nlu run/add:');
      log.error(chalk.magenta(util.inspect(err.message || err)));
      return process.exit(1);
    }

    if (results.runUtility) {
      // if runUtility is defined on results, then we actually ran the tool
      log.good(chalk.green.underline('NPM-Link-Up run was successful. All done.'));
    }

    const cleanMap = results.runUtility;

    if (cleanMap && typeof  cleanMap === 'object') {

      const treeObj = createTree(cleanMap, mainProjectName, originalList, opts);
      const treeString = treeify.asTree(treeObj, true);
      const formattedStr = String(treeString).split('\n').map(function (line) {
        return '\t' + line;
      });

      if (opts.verbosity > 1) {
        log.info(chalk.cyan.bold('NPM-Link-Up results as a visual:'), '\n');
        console.log('^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^');
        console.log(chalk.white(formattedStr.join('\n')));
        console.log('^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^');
      }
    }
    else {
      log.warn('Missing map object; could not create dependency tree visualization.');
    }

    setTimeout(function () {
      process.exit(0);
    }, 100);

  });








