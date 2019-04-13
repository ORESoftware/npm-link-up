'use strict';

import {NluMap, NluMapItem} from "./index";
import {getPath} from "./utils";
import * as util from "util";
import log from "./logging";

////////////////////////////////////////////////////////////////////////////

export const getCleanMap =  (mainDep: NluMapItem, map: NluMap, opts: any): NluMap => {
  
  if(opts.all_packages){
    throw 'Internal error, the --all-packages opt is not permitted at this code path.';
  }
  
  const newMap: NluMap = {};
  
  const getRelevantItems =  (v: string) => {
    
    if (map[v] && !newMap[v]) {
      
      newMap[v] = map[v];
      const list = map[v].deps;
      
      if (!Array.isArray(list)) {
        throw new Error('list should be an array, but is not an array type: ' + JSON.stringify(map[v]));
      }
      
      const mapPath = getPath(map, newMap[v], opts);
      
      list.forEach(l => {
        getRelevantItems(mapPath(l));
      });
    }
    
  };
  
  getRelevantItems(mainDep.path);
  
  
  return newMap;
};

export const getCleanMap2 =  (rootPackageName: string, map: NluMap): NluMap => {
  
  const newMap: NluMap = {};
  
  const getRelevantItems =  (v: string) => {
    
    if (map[v] && !newMap[v]) {
      
      newMap[v] = map[v];
      
      const list = map[v].deps;
      
      if (!Array.isArray(list)) {
        throw new Error('list should be an array, but is not an array type: ' + JSON.stringify(map[v]));
      }
      
      list.forEach(function (l) {
        getRelevantItems(l);
      });
    }
    
  };
  
  getRelevantItems(rootPackageName);
  
  
  return newMap;
};


export const getCleanMapForAllPackagesOpt =  (map: NluMap, opts: any): NluMap => {
  
  const newMap: NluMap = {};
  
  const getRelevantItems =  (v: string) => {
    
    if(!map[v]){
      if(v != null){
        throw 'The map does not have this key:' + v;
      }
      return;
    }
    
    if (!newMap[v]) {
      
      newMap[v] = map[v];
      const list = map[v].deps;
      
      if (!Array.isArray(list)) {
        throw new Error('list should be an array, but is not an array type: ' + JSON.stringify(map[v]));
      }
      
      const mapPath = getPath(map, newMap[v], opts);
      
      list.forEach(l => {
        getRelevantItems(mapPath(l));
      });
    }
    
  };
  
  for(let v of Object.values(map)){
    if(v.hasNLUJSONFile){
      
      if(!v.path){
       throw 'This project should have an associated path: ' + util.inspect(v);
      }
      
      getRelevantItems(v.path);
    }
  }
  
  return newMap;
  
};

export const getCleanMapOfOnlyPackagesWithNluJSONFiles =  (rootPackageName: string, map: NluMap): NluMap => {

  return Object.keys(map).reduce((a,b) => {

    if(map[b].hasNLUJSONFile){
       a[b] = map[b];
    }
    return a;

  }, {} as NluMap)


};
