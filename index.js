#!/usr/bin/env node

//TODO: boolean in config telling us whether to link a project to itself or not
//TODO: boolean in config telling us whether to do an npm install in the lib before npm link
//TODO: list in main project, appends to any list in any subproject
//TODO: instead of just checking for presence of node_modules directory - check to see if all dependencies
// are installed

//core
const cp = require('child_process');
const path = require('path');
const fs = require('fs');
const util = require('util');

//npm
const colors = require('colors/safe');
const async = require('async');
const residence = require('residence');
const cwd = process.cwd();
const root = residence.findProjectRoot(cwd);

/////////////////////////////////////////////////////////////

process.once('exit', function (code) {
  console.log('\n\n => NPM-Link-Up is exiting with code => ', code, '\n');
});

//////////////////////////////////////////////////////////////

if (!root) {
  console.error(' => NPM-Link-Up => You do not appear to be within an NPM project (no package.json could be found).\n' +
    ' => Your present working directory is =>\n' + colors.magenta.bold(cwd));
  process.exit(1);
}

let pkg, conf;

try {
  pkg = require(path.resolve(root + '/package.json'));
  conf = require(path.resolve(root + '/npm-link-up.json'));
}
catch (err) {
  console.error('\n', err.stack || err, '\n');
  process.exit(1);
}

const deps = Object.keys(pkg.dependencies || {}).concat(Object.keys(pkg.devDependencies || {}));

// let list = Object.keys(conf.list || {}).filter(function (k) {
//   if (conf.list[k]) {
//     return true;
//   }
//   console.log(' => The following dependency will not be linked => ', k);
// });

let list = conf.list;

if (list.length < 1) {
  console.error('\n', colors.magenta(' => You do not have any dependencies listed in your npm-link-up.json file.'));
  console.log('\n\n', colors.cyan.bold(util.inspect(conf)));
  return process.exit(1);
}

const searchRoots = conf.searchRoots || [path.resolve(process.env.HOME + '/WebstormProjects/oresoftware')];

const inListButNotInDeps = [];

const inListAndInDeps = list.filter(function (item) {
  const includes = deps.includes(item);
  if (!includes) {
    inListButNotInDeps.push(item);
  }
  return includes;
});

inListButNotInDeps.forEach(function (item) {
  console.error(' => Warning => The following item was listed in your npm-link-up.conf,\n' +
    'but is not listed in your package.json dependencies => "' + item + '".');
});

console.log('\n');

inListAndInDeps.forEach(function (item) {
  console.log(' => The following dep will be NPM link\'ed to this project => "' + item + '".');
});

const map = {};

async.eachLimit(searchRoots, 2, function (item, cb) {

  (function getMarkers(dir, cb) {

    fs.readdir(dir, function (err, items) {

      if (err) {
        console.error(err.stack || err);
        return cb();
      }

      items = items.map(function (item) {
        return path.resolve(dir, item);
      });

      async.eachLimit(items, 5, function (item, cb) {

        fs.stat(item, function (err, stats) {

          if (err) {
            console.log(' => [suman internal] => probably a symlink => ', item);
            console.error(err.stack || err);
            return cb();
          }

          if (stats.isFile()) {
            let dirname = path.dirname(item);
            let filename = path.basename(item);

            if (filename === 'package.json') {

              const pkg = require(item);
              let npmlinkup;

              try{
                 npmlinkup = require(path.resolve(dirname + '/npm-link-up.json'));
              }
              catch(e){
                //ignore
              }

              let isNodeModulesPresent;

              try {
                isNodeModulesPresent = fs.statSync(path.resolve(dirname + '/node_modules')).isDirectory();
              }
              catch(e){
                //ignore
              }

              let isAtLinkShPresent;

              try {
                isAtLinkShPresent = fs.statSync(path.resolve(dirname + '/@link.sh')).isFile();
              }
              catch(e){
                //ignore
              }

              if (list.includes(pkg.name)) {

                let deps = Object.keys(pkg.dependencies || {}).concat(Object.keys(pkg.devDependencies || {}));

                deps = deps.filter(function (d) {
                  return list.includes(d);
                });

                map[pkg.name] = {
                  name: pkg.name,
                  linkToItself: !!(npmlinkup && npmlinkup.linkToItself),
                  runNPMInstall: !!isNodeModulesPresent,
                  hasAtLinkSh: !!isAtLinkShPresent,
                  path: dirname,
                  deps: deps
                };
              }
            }

            cb();
          }
          else if (stats.isDirectory()) {
            if (/\/node_modules\//.test(String(item)) || /\/.git\//.test(String(item))) {
              // console.log(' => Warning => node_modules/.git path ignored => ', item);
              cb();
            }
            else {
              // continue drilling down
              getMarkers(item, cb);
            }
          }
          else {
            console.log(' => Not directory or file => ', item);
            cb();
          }

        });

      }, cb);

    });

  })(item, cb);

}, function (err) {

  if (err) {
    console.error(err.stack || err);
    return process.exit(1);
  }

  const keys = Object.keys(map);

  if (!keys.length) {
    console.error(' => No deps could be found.');
    return process.exit(1);
  }

  console.log('\n => Map => \n', colors.blue.bold(util.inspect(map)));

  function isAllLinked() {
    //Object.values might not be available on all Node.js versions.
    return Object.keys(map).every(function (k) {
      return map[k].isLinked;
    });
  }

  function areAllLinked(names) {
    return names.every(function (name) {
      return map[name].isLinked;
    });
  }

  function findNextDep() {
    // this routine finds the next dep, that has no deps or no unlinked dependencies

    let dep;

    for (let name in map) {
      if (map.hasOwnProperty(name)) {
        if (!map[name].isLinked && areAllLinked(map[name].deps)) {
          dep = map[name];
          break;
        }
      }
    }

    if (!dep) {
      console.error(' => Internal implementation error => no dep found,\nbut there should be at least one yet-to-be-linked dep.');
      return process.exit(1);
    }

    return dep;
  }

  function getNPMLinkList(deps) {
    return deps.map(function (d) {
      return `npm link ${d}`;
    });
  }

  async.until(isAllLinked, function (cb) {

    const dep = findNextDep();
    console.log(' => Processing dep with name => ', dep.name);

    const deps = getNPMLinkList(dep.deps);
    const links = deps.length > 0 ? '&& ' + deps.join(' && ') : '';

    const script = [

      `cd ${dep.path}`,
      '&& npm install',
      links,
      '&& npm link .',
      `&& npm link ${dep.name}`

    ].join(' ');

    console.log('script => ', script);

    dep.isLinked = true;
    process.nextTick(cb);

  }, function (err) {

    if(err){
      console.error(err.stack || err);
      return process.exit(1);
    }

    console.log('all done.');

  });

});





