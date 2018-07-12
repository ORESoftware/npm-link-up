'use strict';

//core
import * as path from 'path';

//project
import chalk from 'chalk';
import log from './logging';
import alwaysIgnoreThese from './always-ignore';
import {NluConf, NLUDotJSON, NLURunOpts} from "./npmlinkup";

/////////////////////////////////////////////////////////////////////////////////

export const getIgnore = function (conf: NLUDotJSON, opts: any) {

  const ignore = (conf.ignore || []).concat(alwaysIgnoreThese)
  .filter(function (item: string, index: number, arr: Array<string>) {
    return arr.indexOf(item) === index;
  })
  .map(function (item: string) {
    return new RegExp(item);
  });

  if (ignore.length > 0) {
    opts.verbosity > 1 && log.info(chalk.underline('NPM-Link-Up will ignore paths that match any of the following regular expressions => '));
    ignore.forEach(function (item: RegExp) {
      opts.verbosity > 1 && log.warning(`ignored => ${item}`);
    });
  }

  return ignore;

};

const flattenDeep = function (arr1: Array<any>): Array<any> {
  return arr1.reduce((acc, val) => Array.isArray(val) ? acc.concat(flattenDeep(val)) : acc.concat(val), []);
};

export const getSearchRoots = function (opts: NLURunOpts, conf: NluConf): Array<string> {

  let searchRoots: Array<string | Array<string>> = [];

  if (opts.search_from_home) {
    searchRoots.push(path.resolve(process.env.HOME));
  }

  if (opts.search_root && opts.search_root.length > 0) {
    searchRoots.push(opts.search_root);
  }


  searchRoots.push([].concat(conf.searchRoots || []).concat(opts.search_root_append || []));

  const searchRootsReduced: Array<string> = [];

  // here we flatten and get rid of dupes and reduce to the most common paths
  flattenDeep(searchRoots).map(d => String(d || '').trim()).filter(Boolean)
  .sort((a, b) => (a.length - b.length))
  .filter((v, i, a) => {
    const s = !a.some(p => {
      return p.startsWith(v + '/');
    });

    if (s) {
      searchRootsReduced.push(v);
    }
  });

  return searchRootsReduced;

};
