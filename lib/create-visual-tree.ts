'use strict';

import util = require('util');
import {NluMap, NluMapItem, NluVisualTree} from "./index";
import log from './logging';
import {NLURunOpts} from "./commands/run/cmd-line-opts";
import chalk from 'chalk';

/////////////////////////////////////////////////////////////////////////////////

export const createTree = function (map: NluMap, mainProjectPath: string, mainDep: NluMapItem, opts: NLURunOpts) {
  
  if (!map[mainProjectPath]) {
    throw new Error('No main project path in the map. Strange.');
  }
  
  const main = map[mainProjectPath];
  
  if (main !== mainDep) {
    throw new Error('Main should be equal to mainDep.');
  }
  
  const getKey = (dep: NluMapItem) => {
    return `${chalk.bold(dep.name)}:${dep.path}`;
  };
  
  type Compare = [string, NluMapItem];
  // sorter, see: https://stackoverflow.com/questions/55624796/sort-object-entries-alphabetically-by-key
  const sorter = ((a: Compare, b: Compare) => b[0] > a[0] ? 1 : (b[0] < a[0] ? -1 : 0));
  
  const root = {};
  let tree: NluVisualTree = {
    [getKey(main)]: root
  };
  
  // const addDepthFirst = (currTreeNode: any, dep: NluMapItem) => {
  //
  //   for (let [k, v] of Object.entries(dep.linkedSet)) {
  //     if (v.visited) {
  //       // currTreeNode[getKey(v)] = currTreeNode[getKey(v)] || null;
  //       continue;
  //     }
  //     v.visited = true;
  //     addDepthFirst(currTreeNode[getKey(v)] = {}, v);
  //   }
  //
  // };
  
  const queue: Array<[any, any, Set<string>, number]> = [];
  
  const addBreadthFirst = (currTreeNode: any, dep: NluMapItem, set: Set<string>, depth: number) => {
    
    const vals = Object.values(dep.linkedSet);
    // const paths = vals.map(v => v.path);
    // const nextSet = new Set([...Array.from(set),...paths]);
    
    for (let v of vals) {
      if(set.has(v.path)){
        // currTreeNode[getKey(v)] = {};
        continue;
      }
      const next = new Set(set);
      next.add(v.path);
      queue.push([currTreeNode[getKey(v)] = {}, v,next,depth+1]);
    }
    
    const popped = queue.shift();
    if (popped) {
      // const s = popped.pop();
      // const newSet = new Set<string>([...Array.from(set),...Array.from(s)]);
      addBreadthFirst(...popped);
      // set.add(popped[1].path);
    }
  };
  
  if (opts.umbrella) {
    for (let v of Object.values(map)) {
      // log.info(v.path,v);
      addBreadthFirst(root, v, new Set<string>(),0);
    }
  }
  else {
    addBreadthFirst(root, main, new Set<string>(),0);
  }
  
  return tree;
  
};


