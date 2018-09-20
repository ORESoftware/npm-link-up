'use strict';

import chalk from 'chalk';

const dashdash = require('dashdash');
import options from "./cmd-line-opts";
import log from '../../logging';

const npmLinkUpPkg = require('../../../package.json');
import residence = require('residence');

const cwd = process.cwd();
import * as path from 'path';
import {globalConfigFilePath} from "../../utils";
import {NluGlobalSettingsConf} from "../../index";

const root = residence.findProjectRoot(cwd);

process.once('exit', code => {
  console.log();
  log.info('Exiting with code:', code, '\n');
});

const allowUnknown = process.argv.indexOf('--allow-unknown') > 0;
let opts: any, parser = dashdash.createParser({options, allowUnknown});

try {
  opts = parser.parse(process.argv);
} catch (e) {
  log.error(chalk.magenta('CLI parsing error:'), chalk.magentaBright.bold(e.message));
  process.exit(1);
}

let conf: NluGlobalSettingsConf = null, confPath: string = null;

if (opts.global) {
  
  confPath = globalConfigFilePath;
  
  try {
    conf = require(globalConfigFilePath);
  }
  catch (err) {
    conf = {};
  }
  
  if (!(conf && typeof conf === 'object')) {
    conf = {};
  }
  
  if (Array.isArray(conf)) {
    conf = {};
  }
}
else {
  
  if (!root) {
    log.error('You want to update the local config, but we could not find a project root - could not find a local package.json file.');
    process.exit(0);
  }
  
  confPath = path.resolve(root + '/.nlu.json');
  
  try {
    conf = require(confPath);
  }
  catch (err) {
    log.error('Could not load your .nlu.json file at path:', confPath);
    throw chalk.magenta(err.message);
  }
  
  if (!(conf && typeof conf === 'object')) {
    conf = {};
  }
  
  if (Array.isArray(conf)) {
    conf = {};
  }
  
}

if (String(opts._args[1] || '').match(/[^a-zA-Z0-9-]+/g)) {
  log.warn('Your key had a bad character, converting to underscore.');
}

if (String(opts._args[2] || '').match(/[^a-zA-Z0-9-]+/g)) {
  log.warn('Your value had a bad character, converting to underscore.');
}

const firstArg = String(opts._args[0] || '').toLowerCase();
const k = String(opts._args[1] || '').toLowerCase().replace(/[^a-zA-Z0-9-]+/g, '_');
const v = String(opts._args[2] || '').toLowerCase().replace(/[^a-zA-Z0-9-]+/g, '_');

if(opts._args[1]){
  log.info('Sanitized key:', `'${k}'`);
}
if(opts._args[2]){
  log.info('Sanitized value:', `'${v}'`);
}

const importGlobal = function (val: string) {
  import(`./global/${val}`).then(m => {
    console.log();
    m.default(opts, confPath, conf, k, v)
  });
};

const globalValues = <any>{};

['delete', 'clear', 'get', 'set'].forEach(meth => {
  globalValues[meth] = () => {
    log.info(`Running "${meth}" on your ${chalk.bold('global')} config.`);
    importGlobal(meth);
  }
});

const importLocal = function (val: string) {
  import(`./local/${val}`).then(m => {
    console.log();
    m.default(opts, confPath, conf, k, v)
  });
};

const localValues: any = {};

['delete', 'clear', 'get', 'set'].forEach(meth => {
  localValues[meth] = () => {
    log.info(`Running "${meth}" on your ${chalk.bold('local')} config (localSettings in .nlu.json).`);
    importLocal(meth);
  }
});

let container = localValues;

if (opts.global) {
  container = globalValues;
}

if (container[firstArg]) {
  container[firstArg]();
}
else {
  log.error('No "nlu config" subcommand was recognized. Your subcommand was:', firstArg);
  process.exit(1);
}


