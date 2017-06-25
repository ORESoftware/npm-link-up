#!/usr/bin/env node
'use strict';

const suman = require('suman');
const Test = suman.init(module, {
  pre: ['clone all repos']
});

Test.create(function (assert, before, after, path, fs, it, rimraf, child_process) {

  const pth = path.resolve(process.env.HOME + '/.npmlinkup/test');
  const sumanProjRoot = path.resolve(pth + '/suman');
  const npmlinkconf = require(path.resolve(sumanProjRoot + '/npm-link-up.json'));

  before.cb('npmlinkup', {timeout: 5000000}, h => {

    console.log('starting npmlinkup...');

    const k = child_process.spawn('bash', [], {
      cwd: pth
    });

    k.once('error', h.fatal);

    // find the executable for this project
    const index = require.resolve('../../index.js');
    // const index = require.resolve('npm-link-up');
    const script = `cd ${sumanProjRoot} && node ${index} --install-all --search-root $HOME/.npmlinkup/test`;
    k.stdin.write(`\n ${script} \n`);
    k.stdout.pipe(process.stdout);
    k.stderr.pipe(process.stderr);
    k.stdin.end();
    k.once('close', function (code) {
      console.log('npmlinkup done with code => ', code);
      h.done(code);
    });

  });

  npmlinkconf.list.forEach(item => {

    it.cb('is symlink', t => {

      const p = path.resolve(sumanProjRoot + '/node_modules/' + item);
      console.log(' =>  Running stat on path => ', p);
      fs.stat(p, t.wrapErrorFirst(function (stats) {
        assert(stats.isSymbolicLink());
      }));

    });

  });

  after.skip.cb('clean up', h => {
    rimraf(pth, h);
  });

});
