'use strict';

//core
import * as cp from 'child_process';

//npm
import log from './logging';
import {EVCb} from "./index";
import * as path from "path";
import * as envstr from '@oresoftware/envstr';

///////////////////////////////////////////////////////////////////////

export const mapPaths = (searchRoots: Array<string>, dirname: string, cb: EVCb<Array<string>>) => {
  
  const mappedRoots = searchRoots
    .map(v => String(v || '').trim())
    .filter(Boolean);
  
  envstr.getEnvStrings(mappedRoots, (err, results) => {
    
    if(err){
      return cb(err);
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
    
    cb(null, pths.map(p => path.isAbsolute(p) ? p : path.resolve(dirname + '/' + p)));
    
  });
};

export const mapPathsOriginal = (searchRoots: Array<string>, dirname: string, cb: EVCb<Array<string>>) => {
  
  const mappedRoots = searchRoots
    .map(v => String(v || '').trim())
    .filter(Boolean)
    .map(function (v) {
      return `echo "${v}"`;
    });
  
  const k = cp.spawn('bash');
  k.stdin.end(mappedRoots.join(';') + '\n');
  const results: Array<string> = [];
  
  k.stdout.setEncoding('utf8');
  k.stderr.setEncoding('utf8');
  k.stderr.pipe(process.stderr);
  
  k.stdout.on('data', d => {
    String(d || '').split('\n')
      .map(v => String(v || '').trim())
      .filter(Boolean).forEach(v => results.push(v));
  });
  
  k.once('error', e => {
    e && log.error(e);
  });
  
  k.once('exit', code => {
    
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
    
    cb(null, pths.map(p => path.isAbsolute(p) ? p : path.resolve(dirname + '/' + p)));
    
  });
};
