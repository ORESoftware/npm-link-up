'use strict';

//core
import * as path from 'path';

//project
import chalk from 'chalk';
import log from './logging';
import alwaysIgnoreThese from './always-ignore';
import {INPMLinkUpConf, NLUDotJSON, NPMLinkUpOpts} from "./npmlinkup";

/////////////////////////////////////////////////////////////////////////////////

export const getIgnore = function (conf: NLUDotJSON) {

  const ignore = (conf.ignore || []).concat(alwaysIgnoreThese)
  .filter(function (item: string, index: number, arr: Array<string>) {
    return arr.indexOf(item) === index;
  })
  .map(function (item: string) {
    return new RegExp(item);
  });

  if (ignore.length > 0) {
    console.log('\n');
    log.info(chalk.underline('NPM-Link-Up will ignore paths that match any of the following regular expressions => '));
    ignore.forEach(function (item: RegExp) {
      log.warning(`ignored => ${item}`);
    });
  }

  return ignore;

};


export const getSearchRoots = function (opts: NPMLinkUpOpts, conf: INPMLinkUpConf) : Array<string>{

  let searchRoots;

  if (opts.search_root && opts.search_root.length > 0) {
    searchRoots = opts.search_root.filter(function (item: string, i: number, arr: Array<string>) {
      return arr.indexOf(item) === i;  // get a unique list
    });
  }
  else {

    if (!conf.searchRoots) {

      log.error('Warning => no "searchRoots" property provided in npm-link-up.json file. ' +
        'NPM-Link-Up will therefore search through your entire home directory.');

      if (opts.force) {
        searchRoots = [path.resolve(process.env.HOME)];
      }
      else {
        log.error(' => But you must use --force at the command line to do this.');
        process.exit(1);
      }
    }

    searchRoots = (conf.searchRoots || []).concat(opts.search_root_append || [])
    .filter(function (item: string, i: number, arr: Array<string>) {
      return arr.indexOf(item) === i;  // get a unique list
    });
  }

  return searchRoots;

};
