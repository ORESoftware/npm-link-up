#!/usr/bin/env node
'use strict';

/*

 docker.r2g notes:

 this file will be copied to this location:

 $HOME/.r2g/temp/project/smoke-test.js

 and it will then be executed with:

 node smoke-test.js


 so, write a smoke test in this file, which only calls require() against your library.
 for example if your library is named "foo.bar", then the *only* require call you
 should make is to require('foo.bar'). If you make require calls to any other library
 in node_modules, then you will got non-deterministic results. require calls to core/built-in libraries are fine.

*/

const assert = require('assert');
const path = require('path');
const cp = require('child_process');
const os = require('os');
const fs = require('fs');
const EE = require('events');

process.on('unhandledRejection', (reason, p) => {
  console.error(reason);
  process.exit(1);
});

const name = 'npm-link-up-test';
const cloneable = 'https://github.com/ORESoftware/npm-link-up-test.git';

const shuffle = function (array) {
  
  array = array.slice(0);
  
  let currentIndex = array.length, temporaryValue, randomIndex;
  
  // While there remain elements to shuffle...
  while (0 !== currentIndex) {
    
    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;
    
    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }
  
  return array;
};


const getProm = function (fn) {
  return new Promise((resolve, reject) => {
    fn((err, val) => err ? reject(err) : resolve(val));
  });
};


const logCommand = function (cmd) {
  console.log('Now running command:', cmd);
  return cmd;
};


const exec = function (command, cwd, cb) {
  const k = cp.spawn('bash', [], {
    cwd: cwd || process.cwd()
  });
  k.stderr.pipe(process.stderr);
  k.stdin.end(`${command}`);
  k.once('exit', cb);
  return k;
};

const mkdirp = function (dir) {
  return getProm(cb =>  {
    exec(logCommand(`mkdir -p ${dir}`), null, cb);
  });
};

const rimraf = function (dir) {
  return getProm(cb =>  {
    exec(logCommand(`rm -rf ${dir}`), null, cb);
  });
};

const cloneProject = function (dir) {
  return getProm(cb =>  {
    exec(logCommand(`git clone ${cloneable} ${name}`), dir, cb);
  });
};


const initNLU = function (dir) {
  return getProm(cb =>  {
    exec(logCommand(`nlu init -f`), dir, cb);
  });
};


const runNLU = function (dir) {
  return getProm(cb =>  {
    exec(logCommand(`nlu run --no-install`), dir, cb);
  });
};


const whichNLU = function () {
  return getProm(cb =>  {
    const k = exec(logCommand(`which nlu`), null, cb);
    console.log("Discovering the path of (which nlu)");
    k.stdout.pipe(process.stdout);
  });
};

const runTest = function (file) {
  return getProm(cb =>  {
    const k = exec(logCommand(`node ${file}`), null, cb);
    k.stdout.pipe(process.stdout);
  });
};


const tempDir = path.resolve(process.env.HOME + '/.nlu/temp');
const proj = path.resolve(tempDir + `/${name}`);

const order = shuffle(['rolo', 'cholo', 'yolo']);

whichNLU()
  .then(v => rimraf(tempDir))
  .then(v => mkdirp(tempDir))
  .then(v => cloneProject(tempDir))
  .then(v => {
    const first = order[0];
    const p = path.resolve(proj + '/' + first);
    return initNLU(p).then(v => p);
  })
  .then(first => {
    return runNLU(first);
  })
  .then(v => {
    const second = order[1];
    const p = path.resolve(proj + '/' + second);
    return initNLU(p).then(v => p);
  })
  .then(second => {
    return runNLU(second);
  })
  .then(v => {
    const third = order[2];
    const p = path.resolve(proj + '/' + third);
    return initNLU(p).then(v => p);
  })
  .then(third => {
    return runNLU(third);
  })
  .then(v => {
    
    let p = Promise.resolve(null);
    
    for (let i = 0; i < order.length; i++) {
      let file = path.resolve(proj + '/' + order[i] + '/test.js');
      p = p.then(v => runTest(file));
    }
    
    return p;
    
  });
