'use strict';

//core
import * as path from 'path';

//project
import chalk from 'chalk';
import log from './logging';
import alwaysIgnoreThese from './always-ignore';
import {NluConf, NLUDotJSON} from "./index";
import * as nluUtils from './utils';
import {NLURunOpts} from "./commands/run/cmd-line-opts";

/////////////////////////////////////////////////////////////////////////////////

export const getIgnore = (conf: NLUDotJSON, opts: any): Array<RegExp> => {
  
  const ignore = nluUtils.getUniqueList(nluUtils.flattenDeep([conf.ignore, alwaysIgnoreThese]))
  .map(d => String(d || '').trim())
  .filter(Boolean)
  .map((item: string) => new RegExp(item));
  
  if (ignore.length > 0) {
    opts.verbosity > 1 &&
    log.info(chalk.underline('NPM-Link-Up will ignore paths that match any of the following regular expressions:'));
    ignore.forEach((item: RegExp) => {
      opts.verbosity > 1 && log.warning(`ignored => ${item}`);
    });
  }
  
  return ignore;
  
};

export const getSearchRoots =  (opts: NLURunOpts, conf: NluConf): Array<string> => {
  
  let searchRoots: Array<string | Array<string>> = [];
  
  if (opts.search_from_home) {
    searchRoots.push(path.resolve(process.env.HOME));
  }
  else if (opts.search_root && opts.search_root.length > 0) {
    searchRoots.push(opts.search_root);
  }
  else {
    searchRoots.push(conf.searchRoots);
    searchRoots.push(opts.search_root_append);
    searchRoots.push(conf.searchRoot);
  }
  
  const searchRootsReduced: Array<string> = [];
  
  // here we flatten and get rid of dupes and reduce to the most common paths
  nluUtils.getUniqueList(nluUtils.flattenDeep(searchRoots))
  .map(d => String(d || '').trim())
  .filter(Boolean)
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
