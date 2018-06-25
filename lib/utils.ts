'use strict';

import Ajv = require('ajv');
import schema = require('../assets/nlu.schema.json');
import log from "./logging";
import {NluConf} from "./npmlinkup";

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
