'use strict';

//core
import * as path from 'path';
import * as fs from 'fs';

//npm
import chalk from 'chalk';
const dashdash = require('dashdash');
import async = require('async');
import residence = require('residence');

//project
import options from "./cmd-line-opts";
import {EVCb, NLUInitOpts} from "../../npmlinkup";
import log from '../../logging';
const npmLinkUpPkg = require('../../../package.json');
const cwd = process.cwd();
const root = residence.findProjectRoot(cwd);
const defaultNluJSON = require('../../../assets/default.nlu.json');

import {makeFindProjects} from "./find-matching-projects";
import alwaysIgnore from './init-ignore';
import alwaysIgnoreThese from "../../always-ignore";

if (!root) {
  log.error('Cannot find a project root given your current working directory:', chalk.magenta(cwd));
  process.exit(1);
}



let opts: NLUInitOpts, parser = dashdash.createParser({options});

try {
  opts = parser.parse(process.argv);
} catch (e) {
  log.error(' => CLI parsing error:', e.message);
  process.exit(1);
}

if (opts.help) {
  let help = parser.help({includeEnv: true}).trimRight();
  console.log('usage: nlu init [OPTIONS]\n' + 'options:\n' + help);
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

const mainProjectName = pkgJSON.name;

if (!mainProjectName) {
  log.error('Your current project does not have a name (no name property in package.json.');
  log.error('That is weird.');
}
else {
  log.info('Your project name is:', mainProjectName);
}

let nluJSON: any, nluJSONPath = path.resolve(root + '/.nlu.json');

try {
  nluJSON = require(nluJSONPath);
  log.error('Looks like your project already has an .nlu.json file.');
  log.error(chalk.gray('Here is the existing file on your file system:'));
  console.log(nluJSON);
  log.error(chalk.bold(`If you want npm-link-up to update this file, use 'nlu update'. Exiting.`), '\n');
  process.exit(0);
}
catch (err) {
  // ignore
}

let searchRoots = opts.search_root;

if (!(searchRoots && searchRoots.length > 0)) {
  log.warn(`Using $HOME to search for related projects. To limit your fs search, use the --search=<path> option.`);
  searchRoots = [process.env.HOME];
  if(!opts.search_from_home){
    log.warn('Please use --search=<path> to confine your project search to something less wide as user home.');
    log.warn('If you wish to use $HOME as the search root, use --search-from-home,',
      'but be aware that it can take a long time to search through user home.');
    process.exit(1);
  }
}
else{
  if(opts.search_from_home){
    log.error('You passed the --search-from-home option along with --search/--search-root.');
    process.exit(1);
  }
}

const ignore = alwaysIgnore.concat(alwaysIgnoreThese)
.filter((item, index, arr) => arr.indexOf(item) === index)
.map(item => new RegExp(item));

const theirDeps = Object.assign({},
  pkgJSON.dependencies,
  pkgJSON.devDependencies,
  pkgJSON.optionalDependencies
);

log.info('Here are the deps in your package.json:', theirDeps);

async.autoInject({

    checkForNluJSONFile(cb: EVCb) {
      fs.stat(nluJSONPath, (err, stats) => cb(null, stats));
    },

    getMatchingProjects(checkForNluJSONFile: any, cb: EVCb) {
      // given package.json, we can find local projects

      if (checkForNluJSONFile) {
        return process.nextTick(cb,
          new Error('Looks like your project already has an .nlu.json file, although it may be malformed.'));
      }

      const map = {};
      const findProjects = makeFindProjects(mainProjectName, ignore, opts, map, theirDeps);

      const q = async.queue(function (task: any, cb) {
        task(cb);
      });

      log.info('Search roots are:', searchRoots);

      searchRoots.forEach((v: string) => {
        q.push(function (cb: EVCb) {
          findProjects(v, cb);
        });
      });

      if (q.idle()) {
        return process.nextTick(cb, new Error('For some reason no items ended up on the search queue.'));
      }

      let first = true;

      q.drain = q.error = function (err?: any) {
        err && q.kill();
        if (first) {
          first = false;
          cb(err, map);
        }
      };

    },

    writeNLUJSON(getMatchingProjects: any, cb: EVCb) {

      const list = Object.keys(getMatchingProjects);
      const newNluJSON = Object.assign({}, defaultNluJSON);
      newNluJSON.list = list;
      const newNluJSONstr = JSON.stringify(defaultNluJSON, null, 2);
      fs.writeFile(nluJSONPath, newNluJSONstr, 'utf8', cb);

    }

  },

  function (err: any, results: any) {

    if (err) {
      log.error('There was an error when running "nlu init".');
      log.error('Here were arguments:', process.argv);
      log.error(err.message || err, '\n');
      return process.exit(1);
    }

    log.veryGood('Looks like the nlu init routine succeeded. ' +
      'Check your new .nlu.json file in the root of your project.');
    process.exit(0);

  });

