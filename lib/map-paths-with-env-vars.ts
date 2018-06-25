'use strict';

//core
import * as cp from 'child_process';

//npm
import log from './logging';
import {EVCb} from "./npmlinkup";

///////////////////////////////////////////////////////////////////////

export const mapPaths = (searchRoots: Array<string>, cb: EVCb) => {

  const mappedRoots = searchRoots
  .map(v => String(v || '').trim())
  .filter(Boolean)
  .map(function (v) {
    return `echo "${v}"`;
  });

  const k = cp.spawn('bash', [], {
    env: Object.assign({}, process.env, {
      NPM_LINK_UP: 'yes'
    })
  });

  k.stdin.end(mappedRoots.join(';'));
  const data: Array<string> = [];

  k.stdout.setEncoding('utf8');
  k.stderr.setEncoding('utf8');
  k.stderr.pipe(process.stderr);

  k.stdout.on('data', (d: string) => {
    data.push(d);
  });

  k.once('error',  (e) => {
    log.error(e.stack || e);
    cb(e, []);
  });

  k.once('exit', (code: number) => {

    if (code > 0) {
      return cb({code: code});
    }

    const pths = data.map((d) => {
      return String(d).trim();
    })
    .filter((item, i, a) => {
      // grab a unique list only
      return a.indexOf(item) === i;
    });

    cb(null, pths);

  });
};
