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
    return validate(data);
  }
  catch(err){
    log.error(err.message);
    return false;
  }

};
