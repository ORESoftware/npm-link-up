'use strict';

//core
import * as path from 'path';
import * as fs from 'fs';

//npm
import readline = require('readline');
import chalk from 'chalk';
const dashdash = require('dashdash');
import async = require('async');
import residence = require('residence');

//project
import options from "./cmd-line-opts";
import {EVCb, NLUAddOpts, NluConf, NLUInitOpts} from "../../npmlinkup";
import log from '../../logging';
const cwd = process.cwd();
const root = residence.findProjectRoot(cwd);
import {makeFindProjects} from "./find-matching-projects";
import alwaysIgnore from './add-ignore';
import alwaysIgnoreThese from "../../always-ignore";
import {mapPaths} from "../../map-paths-with-env-vars";
import {runNPMLink} from "../../run-link";
import {getCleanMap} from "../../get-clean-final-map";
import {validateConfigFile} from "../../utils";

process.once('exit', code => {
  log.info('Exiting with code:', code);
});

if (!root) {
  log.error('Cannot find a project root given your current working directory:', chalk.magenta(cwd));
  process.exit(1);
}

let opts: NLUAddOpts, parser = dashdash.createParser({options});

try {
  opts = parser.parse(process.argv);
} catch (e) {
  log.error(' => CLI parsing error:', e.message);
  process.exit(1);
}

if (opts.help) {
  let help = parser.help({includeEnv: true}).trimRight();
  console.log('usage: nlu add [OPTIONS]\n' + 'options:\n' + help);
  process.exit(0);
}

let pkgJSON: any;

try {
  pkgJSON = require(path.resolve(root + '/package.json'));
}
catch (err) {
  log.error(err);
  log.error('Could not load your projects package.json file.');
  log.error('No package.json file could be found in path:', root);
  process.exit(1);
}

const flattenDeep = function (arr1: Array<any>): Array<any> {
  return arr1.reduce((acc, val) => Array.isArray(val) ? acc.concat(flattenDeep(val)) : acc.concat(val), []);
};

const projectsToAdd = flattenDeep([opts._args]).map(v => String(v || '').trim()).filter(Boolean);

const absolutePaths = projectsToAdd.filter(v => path.isAbsolute(v));

if (absolutePaths.length > 0) {
  throw `NLU cannot currently handle file paths. Instead, use 'nlu add one two three', and nlu will find them on your fs.`;
}

if (projectsToAdd.length < 1) {
  log.error('You did not pass any projects to add. Try: nlu add foo');
  process.exit(1);
}

projectsToAdd.forEach(v => {
  log.info('nlu will add a symlink to this project:', v);
});

const mainProjectName = pkgJSON.name;

if (!mainProjectName) {
  log.error('Your current project does not have a name (no name property in package.json.');
  log.error('That is weird.');
}
else {
  log.info('Your project name is:', chalk.bold.gray(mainProjectName));
}

let nluJSON: NluConf, nluJSONPath = path.resolve(root + '/.nlu.json');

try {
  nluJSON = require(nluJSONPath);
}
catch (err) {
  log.error('Cannot find an .nlu.json config file in your project.');
  log.error('Your project path is:', root);
  throw err.message;
}

if(!validateConfigFile(nluJSON)){
  log.error('Your .nlu.json config file appears to be invalid. To override this, use --override.');
  if(!opts.override){
    process.exit(1);
  }
}

let searchRoots = nluJSON.searchRoots;

if (opts.search_from_home && opts.search_root) {
  log.error('You passed the --search-from-home option along with --search/--search-root.');
  process.exit(1);
}

if (opts.search_from_home) {
  searchRoots = [process.env.HOME];
}

if (opts.search_root) {
  searchRoots = flattenDeep([opts.search_root]).map(v => String(v || '').trim()).filter(Boolean);
}

if (!(searchRoots && searchRoots.length > 0)) {
  log.warn(`Using $HOME to search for related projects. To limit your fs search, use the --search=<path> option.`);
  searchRoots = [process.env.HOME];
  if (!opts.search_from_home) {
    log.warn('Please use --search=<path> to confine your project search to something less wide as user home.');
    log.warn('For multiple search roots, you can use --search more than once.');
    log.warn(`If you wish to use $HOME as the search root, use ${chalk.bold('--search-from-home')},`,
      `but be aware that it can take a long time to search through user home.`);
    process.exit(1);
  }
}
else {
  if (opts.search_from_home) {
    log.error('You passed the --search-from-home option along with --search/--search-root.');
    process.exit(1);
  }
}

const ignore = alwaysIgnore.concat(alwaysIgnoreThese)
.filter((item, index, arr) => arr.indexOf(item) === index)
.map(item => new RegExp(item));

async.autoInject({

    mapSearchRoots(cb: EVCb) {
      log.info(`Mapping original search roots from your root project's "searchRoots" property.`);
      mapPaths(searchRoots, cb);
    },

    getMatchingProjects(mapSearchRoots: Array<string>, cb: EVCb) {

      const map = {}, status = {searching: true};
      const findProjects = makeFindProjects(mainProjectName, ignore, opts, map, projectsToAdd.slice(0), status);

      const q = async.queue(function (task: any, cb) {
        task(cb);
      });

      log.info('Search roots are:', mapSearchRoots);

      mapSearchRoots.forEach((v: string) => {
        q.push(function (cb: EVCb) {
          findProjects(v, cb);
        });
      });

      if (q.idle()) {
        return process.nextTick(cb, new Error('For some reason no items/paths ended up on the search queue.'));
      }

      let first = true;

      q.drain = q.error = function (err?: any) {

        if (err) {
          status.searching = false;
          log.error(chalk.magenta('There was a search queue processing error.'));
        }

        if (first) {
          q.kill();
          cb(err, map);
        }

        first = false;
      };

    },

    runUtility(getMatchingProjects: any, cb: EVCb) {

      try {
        nluJSON.list = nluJSON.list.concat(projectsToAdd)
        .map(v => String(v || '').trim()).filter((v,i,a) => a.indexOf(v) === i);
      }
      catch (e) {
        return process.nextTick(cb, e);
      }


      getMatchingProjects[mainProjectName] = {
        name: mainProjectName,
        bin: pkgJSON.bin || null,
        isMainProject: true,
        linkToItself: Boolean(nluJSON.linkToItself),
        runInstall: Boolean(nluJSON.alwaysReinstall),
        path: root,
        deps: nluJSON.list
      };

      let cleanMap;

      console.log('the unclean map keys:', Object.keys(getMatchingProjects));

      try {
        cleanMap = getCleanMap(mainProjectName, getMatchingProjects);
      }
      catch (err) {
        return process.nextTick(cb, err);
      }

      console.log('the clean map:', Object.keys(cleanMap));

      console.log('\n');
      log.good('Beginning to actually link projects together...');
      runNPMLink(cleanMap, opts, cb);
    },

    addToNLUJSON(runUtility: any, cb: EVCb) {

      // nluJSON.list = Object.keys(projectsToAdd)
      // .concat(nluJSON.list)
      // .filter((v, i, a) => a.indexOf(v) === i);

      const newNluJSONstr = JSON.stringify(nluJSON, null, 2);
      fs.writeFile(nluJSONPath, newNluJSONstr, 'utf8', cb);

    },

  },

  function (err: any, results: any) {

    if (err) {
      log.error('There was an error when running "nlu add".');
      log.error('Here were your command line arguments used:');
      process.argv.forEach((v, i) => log.info(chalk.gray.bold(String(i)), chalk.gray(v)));
      log.error(err.message || err);
      return process.exit(1);
    }

    log.veryGood('Looks like the nlu init routine succeeded. ' +
      'Check your new .nlu.json file in the root of your project.');
    process.exit(0);

  });

