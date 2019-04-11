'use strict';

export const r2gSmokeTest = function () {
  return true;
};

export interface PackagesMap {
  [key: string]: {
    searchRoot: string | Array<string>,
    searchRoots: string | Array<string>,
    list: Array<string>
  }
}

export interface PkgJSON {
  name: string,
  bin?: any,
  dependencies?: {[key: string]: string},
  devDependencies?: {[key: string]: string},
  optionalDependencies?: {[key: string]: string},
  nlu?: any,
  npp?: any,
  r2g?: any
}

export interface NluConf {
  localSettings?: { [key: string]: any }
  linkable: boolean,
  umbrella?: boolean,
  'npm-link-up': boolean,
  comments?: Array<string>,
  alwaysReinstall: boolean,
  linkToItself: boolean,
  searchRoot?: string,
  searchRoots?: Array<string>,
  ignore: Array<string>,
  list?: Array<string>,
  deps?: Array<string>,
  packages: PackagesMap,
  searchable: boolean
}

export type NLUDotJSON =  NluConf;

export type EVCb<T> = (err?: any, val?: T) => void;

export interface NluGlobalSettingsConf {
  [key: string]: string | null | undefined | boolean | number
}

export interface NluMapItem {
  name: string,
  bin: string | { [key: string]: string },
  isMainProject: boolean,
  linkToItself: boolean,
  hasNLUJSONFile: boolean,
  runInstall: boolean,
  path: string,
  deps: Array<string>
  isLinked?: boolean,
  package: PkgJSON,
  searchRoots: Array<string>,
  installedSet: Set<string>
}

export interface NluMap {
  [key: string]: NluMapItem
}

export interface NluVisualTree {
  [key: string]: NluVisualTree
}


