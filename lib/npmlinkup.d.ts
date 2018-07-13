

export interface NluConf {
  'npm-link-up': boolean,
  comments: Array<string>,
  alwaysReinstall: boolean,
  linkToItself: boolean,
  searchRoots: Array<string>,
  ignore: Array<string>,
  list: Array<string>
}

export type EVCb<T> = (err? : any, val?: T) => void;

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
  bin: string | {[key:string]: string},
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

export interface NLUDotJSON {
  ignore: Array<string>,
  list: Array<string>,
  comments: Array<string>,
  searchRoots: Array<string>
  linkToItself: boolean
}
