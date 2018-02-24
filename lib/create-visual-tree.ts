'use strict';

import util = require('util');
import {INPMLinkUpMap, INPMLinkUpVisualTree} from "../index";
import {log} from './logging';

/////////////////////////////////////////////////////////////////////////////////

export const createTree = function (map: INPMLinkUpMap, name: string, originalList: Array<string>) {
  
  let tree: INPMLinkUpVisualTree = {
    [name]: {}
  };
  
  let createItem = function (key: string, obj: INPMLinkUpVisualTree, keys: Array<string>) {
    
    obj[key] = obj[key] || {};
    
    if (map[key]) {
      
      map[key].deps.forEach(function (d: string) {
        
        // console.log('key:', key);
        // console.log('d:', d);
        // console.log('the keys', keys);
        
        if (key !== d && keys.indexOf(d) < 0) {
          keys.push(d);
          let v2 = obj[key][d] = {};
          createItem(d, v2, keys.slice(0));
        }
        else {
          keys.push(d);
          obj[key][d] = null;
        }
        
      });
    }
    else {
      log.warning(`no key named "${key}" in map.`);
    }
    
  };
  
  originalList.forEach(function (k: string) {
    createItem(k, tree[name], [name]);
  });
  
  // console.log('the tree:', util.inspect(tree));
  
  let cleanTree = function (k: string, val: any) {
    
    delete val[k];
    
    Object.keys(val).forEach(function (key) {
      cleanTree(key, val[key]);
    });
    
  };
  
  // get rid of circular references (clean it visually)
  cleanTree(name, tree[name]);
  
  return tree;
  
};
