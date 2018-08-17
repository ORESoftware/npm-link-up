'use strict';

//core
import * as cp from 'child_process';

//npm
import log from './logging';
import {EVCb} from './index';

///////////////////////////////////////////////////////////

export const cleanCache = (cb: EVCb<any>) => {

  const k = cp.spawn('bash');
  
  k.stdin.end('npm cache clean -f;');
  k.stderr.pipe(process.stderr);
  
  k.once('exit',  code => {
    code > 0 ? cb({path: 'npm cache clean', code: code}) : cb(null);
  });

};
