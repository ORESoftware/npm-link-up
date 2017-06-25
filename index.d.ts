export interface INPMLinkUpVisualTree {
    [key: string]: INPMLinkUpVisualTree;
}
export interface INPMLinkUpMapItem {
    name: string;
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
