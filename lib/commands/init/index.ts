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
import {EVCb, NLUInitOpts, NLURunOpts} from "../../npmlinkup";
import log from '../../logging';
import npmLinkUpPkg = require('../../../package.json');
const cwd = process.cwd();
const root = residence.findProjectRoot(cwd);
import defaultNluJSON = require('./default.nlu.json');
import {makeFindProjects} from "./find-matching-projects";
import alwaysIgnore from './init-ignore';
import alwaysIgnoreThese from "../../always-ignore";

if (!root) {
  log.error('Cannot find a project root given your current working directory:', chalk.magenta(cwd));
  process.exit(1);
}

let opts: any, parser = dashdash.createParser({options});

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
  log.warn(nluJSON);
  log.error(`If you want npm-link-up to update this file, use 'nlu update'. Exiting.`);
  process.exit(0);
}
catch (err) {
  // ignore
}

let searchRoots = opts.search_root;

if (!(searchRoots && searchRoots.length > 0)) {
  log.warn(`Using $HOME to search for related projects. To limit your fs search, use the --search=<path> option.`);
  searchRoots = [process.env.HOME];
}

const ignore = alwaysIgnore.concat(alwaysIgnoreThese)
.filter((item, index, arr) => arr.indexOf(item) === index)
.map(item => new RegExp(item));

const theirDeps = [
  pkgJSON.dependencies,
  pkgJSON.devDependencies,
  pkgJSON.optionalDependencies
]
.reduce(Object.assign, {});

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

      searchRoots.forEach((v: string) => {
        q.push(function (cb: EVCb) {
          findProjects(v, cb);
        });
      });

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

    }

  },

  function (err, results) {

  });

log.error('No option was recognized, exiting with 1.');
process.exit(1);
