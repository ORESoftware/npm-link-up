'use strict';

import * as assert from 'assert';
import Ajv = require('ajv');
import schema = require('../assets/nlu.schema.json');
import log from "./logging";
import {EVCb, NluConf} from "./npmlinkup";
import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';
import async = require('async');

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


export const determineIfReinstallIsNeeded = function (nodeModulesPath: string, depsKeys: Array<string>, opts: any, cb: EVCb<boolean>) {


  fs.readdir(nodeModulesPath, (err, originalItemsInNodeModules) => {

    if (err || !Array.isArray(originalItemsInNodeModules)) {
      // if there is an error, node_modules probably does not exist
      opts.verbosity > 1 && log.warn('Reinstalling because node_modules dir does not seem to exist.');
      return cb(null, true);
    }

    const orgItems = originalItemsInNodeModules.filter(v => {
      return String(v).startsWith('@')
    });

    async.eachLimit(orgItems, 3, (item, cb) => {

      fs.readdir(path.resolve(nodeModulesPath + '/' + item), (err, orgtems) => {

        if (err) {
          return cb(err);
        }

        orgtems.forEach(v => {
          originalItemsInNodeModules.push(item + '/' + v)
        });

        cb(null);

      });

    }, (err) => {

      if (err) {
        return cb(err);
      }

      if (originalItemsInNodeModules.length <= depsKeys.length) {
        // if there number of folders in node_modules is less than deps count, we def need to reinstall
        opts.verbosity > 1 && log.warn('Reinstalling because node_modules dir does not have enough folders.');
        return cb(null, true);
      }


      const allThere = depsKeys.every(d => {
        if (originalItemsInNodeModules.indexOf(d) < 0) {
          log.warn('The following dep in package.json', d, 'did not appear to be in node_modules.');
          return false
        }
        return true;
      });

      if (!allThere) {
        // if not all deps in package.json are folders in node_modules, we need to reinstall
        opts.verbosity > 1 && log.warn('Reinstalling because not all package.json dependencies exist in node_modules.');
        return cb(null, true);
      }

      cb(null, false);

    });

  });


};
