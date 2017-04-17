//******************************************************************************************************************************
// this file allows you to configure network dependencies so that the Suman test runner can check to see if all require
// network components are live and ready to be incorporated in the test. Of course, you could just run the tests and see if
// they are live, but this feature allows you to have a fail-fast up-front check that will only run once, thus avoiding
// any potential overload of any of your network components that may already be under load.
// ******************************************************************************************************************************

const rimraf = require('rimraf');
const mkdirp = require('mkdirp');
const path = require('path');
const cp = require('child_process');
const async = require('async');

///////////////////

module.exports = $data => {

  const pth = path.resolve(process.env.HOME + '/.npmlinkup/test');
  const sumanProjRoot = path.resolve(pth + '/suman');

  const all = {
    'suman': 'https://github.com/sumanjs/suman.git',
    'suman-utils': 'https://github.com/sumanjs/suman-utils.git',
    'suman-events': 'https://github.com/sumanjs/suman-events.git',
    'suman-watch': 'https://github.com/sumanjs/suman-watch.git',
    'pragmatik': 'https://github.com/oresoftware/pragmatik.git',
    'residence': 'https://github.com/oresoftware/residence.git'
  };

  return {

    'rimraf': function (v, cb) {
      console.log('rimraf v => ', v);
      rimraf(pth, cb);
    },

    'mkdirp': ['rimraf', function (v, cb) {
      console.log('mkdirp v => ', v);
      mkdirp(pth, cb);
    }],

    'npm init': ['rimraf', 'mkdirp', function (v, cb) {

      console.log('npm init v => ', v);

      const k = cp.spawn('bash', [], {
        cwd: pth
      });
      const script = `npm init -f`;
      k.stdin.write(`\n ${script} \n`);
      k.stderr.pipe(process.stderr);
      k.stdin.end();
      k.once('close', cb);

    }],

    'clone all repos': ['npm init', function (v, cb) {

      console.log('clone all repos v => ', v);

      const keys = Object.keys(all);

      async.eachLimit(keys, 2, function (key, cb) {

        const k = cp.spawn('bash', [], {
          cwd: pth
        });

        const script = `git clone ${all[key]}`;
        k.stdin.write(`\n ${script} \n`);
        k.stderr.pipe(process.stderr);
        k.stdin.end();

        k.once('close', cb);

      }, cb);
    }],

    'npmlinkup': ['clone all repos', function (v, cb) {

      const k = cp.spawn('bash', [], {
        cwd: pth
      });

      // find the executable for this project
      const index = require.resolve('../../index.js');
      const script = `cd ${sumanProjRoot} && node ${index} --install-all --search-root $HOME/.npmlinkup/test`;
      k.stdin.write(`\n ${script} \n`);
      k.stderr.pipe(process.stderr);
      k.stdin.end();
      k.once('close', function (code) {
        console.log('npmlinkup done with code => ', code);
        cb(code);
      });

    }]
  }
};
