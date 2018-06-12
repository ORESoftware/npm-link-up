export interface INPMLinkUpConf {
  alwaysReinstall: boolean,
  linkToItself: boolean,
  searchRoots: Array<string>,
  ignore: Array<string>,
  list: Array<string>
}

export interface NPMLinkUpOpts {
  link_all: boolean,
  link_main: boolean,
  install_all:boolean,
  install_main: boolean,
  search_root: Array<string>,
  clear_all_caches: boolean,
  verbosity: number,
  version: string,
  help: boolean,
  completion: boolean,
  install_all: boolean,
  self_link_all: boolean,
  treeify: boolean,
  force: boolean
}

export interface NPMLinkUpMapItem {
  name: string,
  isMainProject: boolean,
  hasNPMLinkUpJSONFile: boolean,
  linkToItself: boolean,
  runInstall: boolean,
  hasAtLinkSh: boolean,
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
