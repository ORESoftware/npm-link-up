'use strict';

//core
import * as cp from 'child_process';

//npm
import  {stdoutStrm, stderrStrm} from './streaming';
import {logInfo, logError, logWarning, logVeryGood, logGood} from './logging';

///////////////////////////////////////////////////////////////////////

export const mapPaths = function(searchRoots: Array<string>, cb: Function){

  const mappedRoots = searchRoots.map(function (v) {
    return `echo "${v}";`;
  });

  const k = cp.spawn('bash', [], {
    env: Object.assign({}, process.env, {
      NPM_LINK_UP: 'yes'
    })
  });

  k.stdin.write('\n' + mappedRoots.join(' ') + '\n');

  process.nextTick(function () {
    k.stdin.end();
  });

  const data: Array<string> = [];

  k.stdout.setEncoding('utf8');
  k.stderr.setEncoding('utf8');
  k.stderr.pipe(process.stderr);

  k.stdout.on('data', function (d: string) {
    data.push(d);
  });

  k.once('close', function (code: number) {
    if (code > 0) {
      return cb({
        code: code
      });
    }

    const pths = data.map(function (d) {
      return String(d).trim();
    }).filter(function (item, index, array) {
      // grab a unique list only
      return array.indexOf(item) === index;
    });

    cb(null, pths);
  });
};