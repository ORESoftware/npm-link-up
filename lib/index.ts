'use strict';

export const r2gSmokeTest = function () {
  return true;
};

export interface NLUDotJSON {
  localSettings?: { [key: string]: any }
  ignore: Array<string>,
  list: Array<string>,
  comments: Array<string>,
  searchRoots: Array<string>
  linkToItself: boolean,
  alwaysReinstall: boolean
  'npm-link-up': true,
  linkable: boolean
}

export interface PackagesMap {
  [key: string]: any
}

export interface NluConf {
  localSettings?: { [key: string]: any }
  linkable: true,
  'npm-link-up': boolean,
  comments: Array<string>,
  alwaysReinstall: boolean,
  linkToItself: boolean,
  searchRoots: Array<string>,
  ignore: Array<string>,
  list?: Array<string>,
  deps?: Array<string>,
  packages: PackagesMap
}

export type EVCb<T> = (err?: any, val?: T) => void;

export interface NluGlobalSettingsConf {
  [key: string]: string | null | undefined | boolean | number
}

export interface NLURunOpts {
  _args: Array<string>,
  search_from_home: boolean,
  override: boolean,
  link_all: boolean,
  link_main: boolean,
  install_main: boolean,
  search_root: Array<string>,
  clear_all_caches: boolean,
  verbosity: number,
  help: boolean,
  install_all: boolean,
  self_link_all: boolean,
  dry_run: boolean,
  force: boolean,
  search_root_append: string,
  production: boolean
}

export interface NLUInitOpts {
  _args: Array<string>,
  search_from_home: boolean,
  interactive: boolean,
  search_root: Array<string>,
  verbosity: number,
  help: boolean,
  force: boolean,
}

export interface NLUAddOpts {
  _args: Array<string>,
  override: boolean,
  search_root: Array<string>,
  dry_run: boolean,
  search_from_home: boolean,
  verbosity: number,
  help: boolean,
  force: boolean,
}

export interface NLUBasicOpts {
  _args: Array<string>,
  override: boolean,
  bash_completion: boolean,
  verbosity: number,
  help: boolean,
  force: boolean,
}

export interface NluMapItem {
  name: string,
  bin: string | { [key: string]: string },
  isMainProject: boolean,
  linkToItself: boolean,
  runInstall: boolean,
  path: string,
  deps: Array<string>
  isLinked?: boolean
}

export interface NluMap {
  [key: string]: NluMapItem
}

export interface NluVisualTree {
  [key: string]: NluVisualTree
}


