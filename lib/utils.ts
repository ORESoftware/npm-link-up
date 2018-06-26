'use strict';

import * as assert from 'assert';
import Ajv = require('ajv');
import schema = require('../assets/nlu.schema.json');
import log from "./logging";
import {NluConf} from "./npmlinkup";
import chalk from 'chalk';

////////////////////////////////////////////////////////////////////

export const validateConfigFile = function (data: NluConf) {

  try{
    const ajv = new Ajv({allErrors: false}); // options can be passed, e.g. {allErrors: true}
    const validate = ajv.compile(schema);
    const valid = validate(data);
    if(!valid) console.error(validate.errors);
    return valid;
  }
  catch(err){
    log.error(err.message);
    return false;
  }

};


export const validateOptions  = function (opts: any) {

  try{
    assert(opts.verbosity >= 1, chalk.magenta('Verbosity must be an integer between 1 and 4, inclusive'));
    assert(opts.verbosity <= 4, chalk.magenta('Verbosity must be an integer between 1 and 4, inclusive'));
  }
  catch(err){
    log.error(err.message);
    return false;
  }

  return true;

};
