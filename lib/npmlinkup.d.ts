export interface INPMLinkUpConf {
  alwaysReinstall: boolean,
  linkToItself: boolean,
  searchRoots: Array<string>,
  ignore: Array<string>,
  list: Array<string>
}

export type EVCb = (err? : any, val?: any) => void;

export interface NLURunOpts {
  link_all: boolean,
  link_main: boolean,
  install_all:boolean,
  install_main: boolean,
  search_root: Array<string>,
  clear_all_caches: boolean,
  verbosity: number,
  help: boolean,
  install_all: boolean,
  self_link_all: boolean,
  treeify: boolean,
  force: boolean,
  search_root_append: string
}

export interface NLUInitOpts {
  search_root: Array<string>,
  verbosity: number,
  help: boolean,
  force: boolean,
}

export interface NLUBasicOpts {
  bash_completion: boolean,
  verbosity: number,
  help: boolean,
  force: boolean,
}

export interface NPMLinkUpMapItem {
  name: string,
  bin: string | {[key:string]: string},
  isMainProject: boolean,
  hasNPMLinkUpJSONFile: boolean,
  linkToItself: boolean,
  runInstall: boolean,
  path: string,
  deps: Array<string>
  isLinked?: boolean
}

export interface NPMLinkUpMap {
  [key: string]: NPMLinkUpMapItem
}

export interface INPMLinkUpVisualTree {
  [key: string]: INPMLinkUpVisualTree
}

export interface NLUDotJSON {
  ignore: Array<string>,
  list: Array<string>,
  comments: Array<string>,
  searchRoots: Array<string>
  linkToItself: boolean
}
