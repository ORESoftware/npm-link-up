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
import options, {NLUInitOpts} from "./cmd-line-opts";
import {EVCb} from "../../index";
import log from '../../logging';
const npmLinkUpPkg = require('../../../package.json');
const cwd = process.cwd();
const root = residence.findProjectRoot(cwd);
const defaultNluJSON = require('../../../assets/default.nlu.json');
import {makeFindProjects} from "./find-matching-projects";
import alwaysIgnore from './init-ignore';
import alwaysIgnoreThese from "../../always-ignore";
import {mapPaths} from "../../map-paths";

process.once('exit', code => {
  log.info('Exiting with code:', code, '\n');
});

if (!root) {
  log.error('Cannot find a project root given your current working directory:', chalk.magenta(cwd));
  log.error(' => NLU could not find a package.json file within your cwd.');
  process.exit(1);
}

const allowUnknown = process.argv.indexOf('--allow-unknown') > 0;
let opts: NLUInitOpts, parser = dashdash.createParser({options, allowUnknown});

try {
  opts = parser.parse(process.argv);
} catch (e) {
  log.error(chalk.magenta('CLI parsing error:'), chalk.magentaBright.bold(e.message));
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
  log.info('Your project name is:', chalk.bold.blueBright(mainProjectName));
}

let nluJSON: any, nluJSONPath = path.resolve(root + '/.nlu.json');

try {
  nluJSON = require(nluJSONPath);
  log.warn(chalk.magenta('Looks like your project already has an .nlu.json file.'));
  if (opts.verbosity > 3) {
    log.warn(chalk.gray('Here is the existing file on your file system:'));
    console.log(nluJSON);
  }
  process.exit(1);
}
catch (err) {
  // ignore
}

const searchRoots: Array<string> = [];

const ignore = alwaysIgnore.concat(alwaysIgnoreThese)
.filter((item, index, arr) => arr.indexOf(item) === index)
.map(item => new RegExp(item));

const theirDeps = Object.assign({},
  pkgJSON.dependencies,
  pkgJSON.devDependencies,
  pkgJSON.optionalDependencies
);

if (opts.verbosity > 3) {
  log.info('Here are the deps in your package.json:', Object.keys(theirDeps));
}

async.autoInject({
    
    checkForNluJSONFile(cb: EVCb<any>) {
      fs.stat(nluJSONPath, (err, stats) => cb(null, stats));
    },
    
    askUserAboutSearchRoots(cb: EVCb<any>) {
      
      if (opts.force) {
        const dirname = path.dirname(cwd);
        const defaultSearchRoot = String(dirname).replace(String(process.env.HOME), '$HOME');
        searchRoots.push(defaultSearchRoot);
        return process.nextTick(cb);
      }
      
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      process.nextTick(() => {
        console.log();
        console.log(chalk.gray(` => To skip this, hit return with no input.`));
        console.log(chalk.gray(` => Separate multiple paths with ":"`));
        console.log(chalk.gray(` => Use env variables like $HOME instead of hardcoding dirs, where possible.`));
        console.log(chalk.bold(` => Valid input might be:`), `$HOME/WebstormProjects:$HOME/vscode_projects`);
      });
      
      console.log();
      
      rl.question(chalk.bold(`What folder(s) do local dependencies of this project '${chalk.blueBright(mainProjectName)}' reside in?\n`), a => {
        
        String(a || '').trim()
        .split(':')
        .map(v => String(v || '').trim())
        .filter(Boolean)
        .forEach(v => {
          
          const s = !searchRoots.some(p => {
            return p.startsWith(v + '/');
          });
          
          if (s) {
            searchRoots.push(v);
          }
          
        });
        
        if (searchRoots.length < 1) {
          searchRoots.push('$HOME');
        }
        
        cb(null);
        
        rl.close();
      });
      
    },
    
    mapSearchRoots(askUserAboutSearchRoots: any, cb: EVCb<any>) {
      mapPaths(searchRoots, root, cb);
    },
    
    getMatchingProjects(askUserAboutSearchRoots: string, mapSearchRoots: Array<string>, checkForNluJSONFile: any, cb: EVCb<any>) {
      // given package.json, we can find local projects
      
      if (checkForNluJSONFile) {
        return process.nextTick(cb,
          new Error('Looks like your project already has an .nlu.json file, although it may be malformed.'));
      }
      
      const map = {}, status = {searching: true};
      const findProjects = makeFindProjects(mainProjectName, ignore, opts, map, theirDeps, status);
      
      type Task = (cb: EVCb<any>) => void;
      const q = async.queue<Task, any>((task, cb) => task(cb));
      
      log.info('Your search roots are:', mapSearchRoots);
      
      mapSearchRoots.forEach((v: string) => {
        q.push(function (cb) {
          findProjects(v, cb);
        });
      });
      
      if (q.idle()) {
        return process.nextTick(cb, new Error('For some reason no items ended up on the search queue.'));
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
    
    writeNLUJSON(askUserAboutSearchRoots: string, getMatchingProjects: any, cb: EVCb<any>) {
      const list = Object.keys(getMatchingProjects);
      const newNluJSON = Object.assign({}, defaultNluJSON);
      newNluJSON.searchRoots = searchRoots;
      newNluJSON.list = list;
      const newNluJSONstr = JSON.stringify(newNluJSON, null, 2);
      fs.writeFile(nluJSONPath, newNluJSONstr, 'utf8', cb);
    }
    
  },
  
  (err: any, results: any) => {
    
    if (err) {
      log.error('There was an error when running "nlu init".');
      opts.verbosity > 3 && log.error('Here were your arguments:\n', process.argv);
      log.error(err.message || err);
      return process.exit(1);
    }
    
    log.veryGood(chalk.green('Looks like the nlu init routine succeeded. ') +
      'Check your new .nlu.json file in the root of your project.');
    process.exit(0);
    
  });

