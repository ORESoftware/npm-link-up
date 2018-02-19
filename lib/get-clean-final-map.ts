import {INPMLinkUpMap} from "../index";


export const getCleanMap = function (rootPackageName: string, map: INPMLinkUpMap) : INPMLinkUpMap {
  
  const newMap: INPMLinkUpMap = {};
  
  const getRelevantItems = function(v: string){
    
    if(map[v]){
      
      newMap[v] = map[v];
      
      const list = map[v].deps;
      if(!Array.isArray(list)){
        throw new Error('list should be an array, but is not a array type: ' + JSON.stringify(map[v]));
      }
      
      list.forEach(function (l) {
        getRelevantItems(l);
      });
    }
    
  };
  
  getRelevantItems(rootPackageName);
  
  // Object.keys($map).filter(function (k) {
  //   return totalList.get(String(k));
  // })
  // .forEach(function (k) {
  //   map[k] = $map[k];
  // });
  
  return newMap;
};
