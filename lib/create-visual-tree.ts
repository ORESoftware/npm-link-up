'use strict';

import util = require('util');
import {NluMap, NluMapItem, NluVisualTree} from "./index";
import log from './logging';
import {NLURunOpts} from "./commands/run/cmd-line-opts";
import chalk from 'chalk';

/////////////////////////////////////////////////////////////////////////////////


export const createTree = function (map: NluMap, mainProjectPath: string, mainDep: NluMapItem, opts: NLURunOpts) {
  
  if(!map[mainProjectPath]){
    throw new Error('No main project path in the map. Strange.');
  }
  
  const main = map[mainProjectPath];
  
  const getKey = (dep: NluMapItem) => {
    return `${chalk.bold(dep.name)}:${dep.path}`;
  };
  
  const root = {};
  let tree: NluVisualTree = {
    [getKey(main)]: root
  };

  const add = (currTreeNode: any, dep: NluMapItem) => {
    
    for(let [k,v] of Object.entries(dep.linkedSet)){
      // console.log({path: dep.path,key:k});
      if(v.visited){
        // currTreeNode[getKey(v)] = null;
        // currTreeNode[getKey(v)] = currTreeNode[getKey(v)] || null;
        continue;
      }
      v.visited = true;
      add(currTreeNode[getKey(v)] = {}, v);
    }
    
  };
  
  add(root, main);
  
  return tree;
  
};


export const createTreeOld = function (map: NluMap, name: string, originalList: Array<string>, opts: NLURunOpts) {
    
    let tree: NluVisualTree = {
      [name]: {}
    };
    
    let createItem = function (key: string, obj: NluVisualTree, keys: Array<string>) {
      
      obj[key] = obj[key] || {};
      
      if (!(map[key] && Array.isArray(map[key].deps))) {
        opts.verbosity > 1 && log.warning(`warning: no key named "${key}" in map.`);
        return;
      }
      
      if (!Array.isArray(map[key].deps)) {
        log.warning(`warning: deps is not an array => ${util.inspect(map[key])}.`);
        return;
      }
      
      map[key].deps.forEach(function (d: string) {
        
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
      
    };
    
    originalList.forEach( (k: string) => {
      tree[name] && createItem(k, tree[name], [name]);
    });
    
    let cleanTree =  (k: string, val: any) => {
      
      delete val[k];
      
      Object.keys(val).forEach(function (key) {
        val[key] && cleanTree(key, val[key]);
      });
      
    };
    
    // get rid of circular references (clean it visually)
    cleanTree(name, tree[name]);
    
    return tree;
    
  };
