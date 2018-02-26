import { INPMLinkUpMap, INPMLinkUpOpts } from "../index";
export declare const createTask: (searchRoot: string, findProject: any) => (cb: Function) => void;
export declare const makeFindProject: (totalList: Map<string, boolean>, map: INPMLinkUpMap, ignore: RegExp[], opts: INPMLinkUpOpts) => (item: string, cb: Function) => void;
