#!/usr/bin/env node
'use strict';

const suman = require('suman');
const Test = suman.init(module);

Test.create(function (assert, before, after, rimraf, mkdirp, async, child_process, path) {

  const all = [
    'suman',
    'suman-utils',
    'suman-events',
    'suman-watch',
    'pragmatik',
    'residence'
  ];

  const pth = path.resolve(process.env.HOME + '/.npmlinkup/test');

  before.cb('rimraf', h => {
    rimraf(pth, h);
  });

  before.cb('mkdirp', h => {
    mkdirp(pth, h);
  });

  before.cb('npm init', h => {
    const k = child_process.spawn('bash', [], {
      cwd: pth
    });

    const script = `npm init -f`;
    k.stdin.write(`\n ${script} \n`);

    k.stderr.pipe(process.stderr);

    k.stdin.end();

    k.once('close', h.done);
  });

  before.cb('install', {timeout: 1000000}, h => {
    async.eachLimit(all, 2, function (item, cb) {

      const k = child_process.spawn('bash', [], {
        cwd: pth
      });

      const script = `npm install ${item}@latest`;
      k.stdin.write(`\n ${script} \n`);

      k.stderr.pipe(process.stderr);

      k.stdin.end();

      k.once('close', cb);

    }, h.done);
  });

  after('clean up', h => {
    console.log('after');
  });

});
