'use strict';

import {NPMLinkUpMap} from "./npmlinkup";

////////////////////////////////////////////////////////////////////////////

export const getCleanMap = function (rootPackageName: string, map: NPMLinkUpMap): NPMLinkUpMap {
  
  const newMap: NPMLinkUpMap = {};
  
  const getRelevantItems = function (v: string) {
    
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
