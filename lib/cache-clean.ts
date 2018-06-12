'use strict';

//core
import * as cp from 'child_process';

//npm
import log from './logging';

///////////////////////////////////////////////////////////

export const cleanCache = function(cb: Function){

  const k = cp.spawn('bash', [], {
    env: Object.assign({}, process.env, {
      NPM_LINK_UP: 'yes'
    })
  });

  k.stdin.end('npm cache clean -f;');

  k.stdout.setEncoding('utf8');
  k.stderr.setEncoding('utf8');
  k.stderr.pipe(process.stderr);

  k.once('error', function(e){
     log.error('npm cache clean/yarn cache clean experience spawn error =>\n', e.stack || e);
  });

  k.once('exit', function (code: number) {
    code > 0 ? cb({path: 'npm cache clean', code: code}) : cb();
  });

};
