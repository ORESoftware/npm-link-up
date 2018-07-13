'use strict';

import chalk from 'chalk';
const dashdash = require('dashdash');
import options from "./cmd-line-opts";
import {NLURunOpts} from "../../npmlinkup";
import log from '../../logging';
const npmLinkUpPkg = require('../../../package.json');
import residence = require('residence');
const cwd = process.cwd();
import addOpts from '../add/cmd-line-opts';
import initOpts from '../init/cmd-line-opts';
import runOpts from '../run/cmd-line-opts';
import * as path from 'path';
import {globalConfigFilePath} from "../../utils";
import {NluGlobalSettingsConf} from "../../index";
const root = residence.findProjectRoot(cwd);

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



let conf : NluGlobalSettingsConf= null, confPath : string = null;

if(opts.global){

  confPath = globalConfigFilePath;

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
}
else{

  if(!root){
    log.error('You want to update the local config, but we could not find a project root - could not find a local package.json file.');
    process.exit(0);
  }

   confPath = path.resolve(root + '/.nlu.json');

  try{
    conf = require(confPath);
  }
  catch(err){
    log.error('Could not load your .nlu.json file at path:', confPath);
    throw chalk.magenta(err.message);
  }

  if(!(conf && typeof conf === 'object')){
    conf = {};
  }

  if(Array.isArray(conf)){
    conf = {};
  }

}


if(String(opts._args[1] || '').match(/[^a-zA-Z_-]+/g)){
  log.warn('Your key had a bad character, converting to underscore.');
}

if(String(opts._args[2] || '').match(/[^a-zA-Z_-]+/g)){
  log.warn('Your value had a bad character, converting to underscore.');
}


const firstArg = String(opts._args[0] || '').toLowerCase();
const k = String(opts._args[1] || '').toLowerCase().replace(/[^a-zA-Z]+/g ,'_');
const v = String(opts._args[2] || '').toLowerCase().replace(/[^a-zA-Z]+/g ,'_');


const importGlobal = function(val: string){
  import(`./global/${val}`).then(m =>{
    console.log();
    m.default(opts, confPath, conf, k, v)
  });
};

const globalValues = <any>{

  delete(){
    log.info('Running "delete" on your global config for key:',k);
    importGlobal('delete');
  },

  clear(){
    log.info('Running "clear" on your global config');
    importGlobal('clear');
  },

  get(){
    log.info('Running "get" on your global config.');
    importGlobal('get');
  },

  set(){
    log.info('Running "set" on your global config.');
    importGlobal('set');
  }
};


const importLocal = function(val: string){
   import(`./local/${val}`).then(m =>{
     console.log();
      m.default(opts, confPath, conf, k, v)
   });
};

const localValues = <any>{

  delete(){
    log.info('Running "delete" on your local config (localSettings in .nlu.json).');
    importLocal('delete');
  },

  clear(){
    log.info('Running "clear" on your local config (localSettings in .nlu.json).');
    importLocal('clear');
  },

  get(){
    log.info('Running "get" on your local config (localSettings in .nlu.json).');
    importLocal('get');
  },

  set(){
    log.info('Running "set" on your local config (localSettings in .nlu.json).');
    importLocal('set');
  }
};


let container = localValues;

if(opts.global){
  container = globalValues;
}


if(container[firstArg]){
  container[firstArg]();
}
else{
  log.error('No "nlu config" subcommand was recognized. Your subcommand was:', firstArg);
  process.exit(1);
}


