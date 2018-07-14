'use strict';

import {NluMap} from "./index";

////////////////////////////////////////////////////////////////////////////

export const getCleanMap = function (rootPackageName: string, map: NluMap): NluMap {
  
  const newMap: NluMap = {};
  
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
