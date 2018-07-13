'use strict';

import chalk from 'chalk';
const dashdash = require('dashdash');
import options from "./cmd-line-opts";
import {NLURunOpts} from "../../npmlinkup";
import log from '../../logging';
const npmLinkUpPkg = require('../../../package.json');
import residence = require('residence');
const cwd = process.cwd();
const root = residence.findProjectRoot(cwd);
import addOpts from '../add/cmd-line-opts';
import initOpts from '../init/cmd-line-opts';
import runOpts from '../run/cmd-line-opts';
import get from './get';
import set from './set';
import * as path from 'path';
import {globalConfigFilePath} from "../../utils";
import clear from "./clear";
import del from './delete';

process.once('exit', code => {
  console.log();
  log.info('Exiting with code:', code, '\n');
});


let opts: any, parser = dashdash.createParser({options});

try {
  opts = parser.parse(process.argv);
} catch (e) {
  log.error(chalk.magenta(' => CLI parsing error:'), chalk.magentaBright.bold(e.message));
  process.exit(1);
}

export interface NluGlobalSettingsConf {
  [key:string]: string | null | undefined | boolean | number
}


let conf : NluGlobalSettingsConf= null;

try{
   conf = require(globalConfigFilePath);
}
catch(err){
   conf = {};
}

if(!(conf && typeof conf === 'object')){
  conf = {};
}

if(Array.isArray(conf)){
  conf = {};
}

if(String(opts._args[1] || '').match(/[^a-zA-Z_-]+/g)){
  log.warn('Your key had a bad character, converting to underscore.');
}

if(String(opts._args[2] || '').match(/[^a-zA-Z_-]+/g)){
  log.warn('Your value had a bad character, converting to underscore.');
}

console.log();

const firstArg = String(opts._args[0] || '').toLowerCase();
const k = String(opts._args[1] || '').toLowerCase().replace(/[^a-zA-Z]+/g ,'_');
const v = String(opts._args[2] || '').toLowerCase().replace(/[^a-zA-Z]+/g ,'_');


const values = <any>{

  delete(){
    del(opts, conf, k);
  },

  clear(){
    clear(opts, conf);
  },

  get(){
    get(opts, conf, k);
  },

  set(){
    set(opts, conf, k, v);
  }
};



if(values[firstArg]){
  values[firstArg]();
}
else{
  log.error('No nlu config subcommand was recognized. To get all keys from the config, simply run "$ nlu config get"');
  process.exit(1);
}


