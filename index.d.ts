export interface INPMLinkUpOpts {
    clear_all_caches: boolean;
    verbosity: number;
    version: string;
    help: boolean;
    completion: boolean;
    install_all: boolean;
    self_link_all: boolean;
    treeify: boolean;
}
export interface INPMLinkUpMapItem {
    name: string;
    hasNPMLinkUpJSONFile: boolean;
    linkToItself: boolean;
    runInstall: boolean;
    hasAtLinkSh: boolean;
    path: string;
    deps: Array<string>;
    isLinked?: boolean;
}
export interface INPMLinkUpMap {
    [key: string]: INPMLinkUpMapItem;
}
export interface INPMLinkUpVisualTree {
    [key: string]: INPMLinkUpVisualTree;
}
