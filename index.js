#!/usr/bin/env node

//TODO: boolean in config telling us whether to link a project to itself or not
//TODO: boolean in config telling us whether to do an npm install in the lib before npm link
//TODO: list in main project, appends to any list in any subproject
//TODO: instead of just checking for presence of node_modules directory - check to see if all dependencies
// are installed
//TODO: boolean - select either rimraf node_modules or just remove/replace symlinks

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
}
catch (e) {
  console.error('\n', e.stack || e, '\n');
  console.error(colors.magenta.bold(' => Bizarrely, you do not have a "package.json" file in the root of your project.'));
  process.exit(1);
}

try {
  conf = require(path.resolve(root + '/npm-link-up.json'));
}
catch (e) {
  console.error('\n', e.stack || e, '\n');
  console.error(colors.magenta.bold(' => You do not have an "npm-link-up.json" file in the root of your project. ' +
    'You need this config file for npmlinkup to do it\'s thing.'));
  process.exit(1);
}

const name = pkg.name;

if (!name) {
  console.error(' => Ummmm, your package.json file does not have a name property. Fatal.');
  return process.exit(1);
}

const deps = Object.keys(pkg.dependencies || {}).concat(Object.keys(pkg.devDependencies || {}));

if (!deps.length) {
  console.error(' => Ummmm, your package.json file does not have any dependencies listed.');
  return process.exit(0);
}

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

const searchRoots = conf.searchRoots || [path.resolve(process.env.HOME)];

if (!conf.searchRoots) {
  console.error(' => Warning => no "searchRoots" property provided, NPM-Link-Up must therefore search through your entire home directory.');
}

const inListButNotInDeps = [];

const inListAndInDeps = list.filter(function (item) {
  const includes = deps.includes(item);
  if (!includes) {
    inListButNotInDeps.push(item);
  }
  return includes;
});

inListButNotInDeps.forEach(function (item) {
  console.error(colors.red.bold(' => Warning => The following item was listed in your npm-link-up.conf,\n' +
    'but is not listed in your package.json dependencies => "' + item + '".'));
});

//push this very projects name
list.push(name);

list = list.filter(function (item, index) {
  return list.indexOf(item) === index;
});

const alwaysIgnoreThese = [
  '/node_modules/',
  '/git/'
];

const ignore = (conf.ignore || []).concat(alwaysIgnoreThese).filter(function (item, index, arr) {
  return arr.indexOf(item) === index;
}).map(function (item) {
  return new RegExp(item);
});

function isIgnored(pth) {
  return ignore.some(function (r) {
    if (r.test(pth)) {
      if (false) {
        console.log(`\n=> Path with value ${pth} was ignored because it matched the following regex:\n${r}`);
      }
      return true;
    }
  });
}

ignore.length && (console.log('\n => NPM Link Up will ignore paths that match any of the following => ') || true) &&
ignore.forEach(function (item) {
  console.log(colors.gray.bold(item));
});

console.log('\n');

inListAndInDeps.forEach(function (item) {
  console.log(' => The following dep will be NPM link\'ed to this project => "' + item + '".');
});

const strm = fs.createWriteStream(path.resolve(root + '/npm-link-up.log'));
const map = {};

async.autoInject({

  npmCacheClean: function (cb) {

    if (true) {
      return process.nextTick(cb);
    }

    const k = cp.spawn('bash', [], {
      NPM_LINK_UP: 'yes'
    });

    k.stdin.write('\n' + 'npm cache clean' + '\n');

    process.nextTick(function () {
      k.stdin.end();
    });

    k.stdout.setEncoding('utf8');
    k.stderr.setEncoding('utf8');
    k.stderr.pipe(process.stderr);
    k.once('error', cb);

    k.once('close', function (code) {
      if (code) {
        cb({
          path: 'npm cache clean',
          code: code
        })
      }
    })

  },

  searchRoots: function (npmCacheClean, cb) {

    const mappedRoots = searchRoots.map(function (v) {
      return `echo "${v}";`;
    });

    const k = cp.spawn('bash', [], {
      NPM_LINK_UP: 'yes'
    });

    k.stdin.write('\n' + mappedRoots + '\n');

    process.nextTick(function () {
      k.stdin.end();
    });

    const data = [];

    k.stdout.setEncoding('utf8');
    k.stderr.setEncoding('utf8');
    k.stderr.pipe(process.stderr);

    k.stdout.on('data', function (d) {
      data.push(d);
    });

    k.once('close', function (code) {
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
  },

  findItems: function (searchRoots, cb) {

    console.log('\n', colors.cyan(' => Searching these roots => \n'), searchRoots);

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

                  try {
                    npmlinkup = require(path.resolve(dirname + '/npm-link-up.json'));
                  }
                  catch (e) {
                    //ignore
                  }

                  let isNodeModulesPresent;

                  try {
                    isNodeModulesPresent = fs.statSync(path.resolve(dirname + '/node_modules')).isDirectory();
                  }
                  catch (e) {
                    //ignore
                  }

                  let isAtLinkShPresent;

                  try {
                    isAtLinkShPresent = fs.statSync(path.resolve(dirname + '/@link.sh')).isFile();
                  }
                  catch (e) {
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
                // if (/\/node_modules\//.test(String(item)) || /\/.git\//.test(String(item))) {
                if (isIgnored(String(item))) {
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

    }, cb);

  },

  runUtility: function (findItems, cb) {

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

    function areAllLinked(names, n) {
      return names.every(function (name) {
        console.log('name => ', name, 'n => ', n);
        if (name === n) {
          // handle circular deps
          console.log('!! handled circular deps');
          return true;
        }
        return map[name].isLinked;
      });
    }

    function getCountOfUnlinkedDeps(dep) {
      return dep.deps.filter(function (d) {
        return !d.isLinked;
      }).length;
    }

    function findNextDep() {
      // not anymore: this routine finds the next dep, that has no deps or no unlinked dependencies
      // this routine finds the next dep with the fewest number of unlinked dependencies

      let dep;
      let count = null;

      for (let name in map) {
        if (map.hasOwnProperty(name)) {
          let $dep = map[name];
          if (!$dep.isLinked) {
            if (!count) {
              dep = $dep;
              count = dep.deps.length;
            }
            else if (getCountOfUnlinkedDeps($dep) < count) {
              dep = $dep;
              count = dep.deps.length;
            }
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
      return deps.filter(function (d) {
        return map[d].isLinked;
      })
      .map(function (d) {
        return `npm link ${d}`;
      });
    }

    function getCommandListOfLinked(name) {
      return Object.keys(map)
      .filter(function (k) {
        return map[k].isLinked && map[k].deps.includes(name);
      })
      .map(function (k) {
        return `cd ${map[k].path} && npm link ${name}`;
      });
    }

    console.log('\n\n');

    async.until(isAllLinked, function (cb) {

      console.log(` => Searching for next dep to run.`);

      const dep = findNextDep();
      console.log(' => Processing dep with name => ', dep.name);

      const deps = getNPMLinkList(dep.deps);
      const links = deps.length > 0 ? '&& ' + deps.join(' && ') : '';

      const script = [

        `cd ${dep.path}`,
        dep.runNPMInstall ? '&& rm -rf node_modules && npm install' : '',
        links,
        '&& npm link .',
        `&& npm link ${dep.name}`

      ].filter(i => i).join(' ');

      console.log(' => Script is => ', script);
      console.log('\n');

      const k = cp.spawn('bash', [], {
        env: Object.assign({}, process.env, {
          NPM_LINK_UP: 'yes'
        })
      });

      k.stdin.write('\n' + script + '\n');

      strm.write('\n\n >>> Beginning of "' + dep.name + '"...\n\n');

      k.stdout.setEncoding('utf8');
      k.stderr.setEncoding('utf8');
      k.stdout.pipe(strm, {end: false});
      k.stderr.pipe(strm, {end: false});

      process.nextTick(function () {
        k.stdin.end();
      });

      let data = '';
      k.stderr.on('data', function (d) {
        data += d;
      });

      k.once('error', cb);

      k.once('close', function (code) {

        if (code > 0) {

          console.log(`\n => Dep with name "${dep.name}" is done, but with an error.\n`);

          cb({
            code: code,
            dep: dep,
            error: data
          });
        }
        else {

          console.log(`\n => Dep with name "${dep.name}" is done.\n`);

          dep.isLinked = map[dep.name].isLinked = true;

          function linkPreviouslyUnlinked(cb) {

            const cmds = getCommandListOfLinked(dep.name);

            if (!cmds.length) {
              return process.nextTick(cb);
            }

            const cmd = cmds.join(' && ');
            strm.write(`\n => Running this command for "${dep.name}" =>\n"${cmd}".\n\n\n`);

            const k = cp.spawn('bash', [], {
              env: Object.assign({}, process.env, {
                NPM_LINK_UP: 'yes'
              })
            });

            k.stdin.write('\n' + cmd + '\n');

            k.stdout.setEncoding('utf8');
            k.stderr.setEncoding('utf8');
            k.stdout.pipe(strm, {end: false});
            k.stderr.pipe(strm, {end: false});

            process.nextTick(function () {
              k.stdin.end();
            });

            k.once('close', cb);

          }

          linkPreviouslyUnlinked(function (err) {
            cb(err, {
              code: code,
              dep: dep,
              error: data
            });
          });

        }
      });

    }, cb);
  }

}, function (err) {

  if (err) {
    console.error(err.stack || err);
    return process.exit(1);
  }

  strm.write('\n\n => NPM-Link-Up run was successful. All done.\n\n');
  strm.end();

  setTimeout(function () {
    process.exit(0);
  }, 100);

});








