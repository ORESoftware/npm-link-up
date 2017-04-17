#!/usr/bin/env node
'use strict';

const suman = require('suman');
const Test = suman.init(module, {
  pre: ['npmlinkup']
});

Test.create(function (assert, before, after, path, fs, it, rimraf) {

  const pth = path.resolve(process.env.HOME + '/.npmlinkup/test');
  const sumanProjRoot = path.resolve(pth + '/suman');
  const npmlinkconf = require(path.resolve(sumanProjRoot + '/npm-link-up.json'));

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
