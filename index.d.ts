export interface INPMLinkUpOpts {
    verbosity: number;
    version: string;
    help: boolean;
    completion: boolean;
    treeify: boolean;
}
export interface INPMLinkUpVisualTree {
    [key: string]: INPMLinkUpVisualTree;
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
