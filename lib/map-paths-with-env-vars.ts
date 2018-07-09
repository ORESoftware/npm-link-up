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
  const results: Array<string> = [];

  k.stdout.setEncoding('utf8');
  k.stderr.setEncoding('utf8');
  k.stderr.pipe(process.stderr);

  k.stdout.on('data', (d: string) => {
    String(d || '').split('\n')
    .map(v => String(v || '').trim())
    .filter(Boolean).forEach(v => {
      results.push(v);
    });
  });

  k.once('error', (e) => {
    cb(e || new Error('Missing error - error was mia.'));
  });

  k.once('exit', (code: number) => {

    if (code > 0) {
      return cb({code: code});
    }

    const pths: Array<string> = [];

    results.map(d => String(d || '').trim())
    .filter(Boolean)
    .sort((a, b) => (a.length - b.length))
    .forEach(v => {

      const s = !pths.some(p => {
        return p.startsWith(v + '/');
      });

      if (s) {
        pths.push(v);
      }
    });

    cb(null, pths);

  });
};
