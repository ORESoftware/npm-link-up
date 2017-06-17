#!/usr/bin/env node

//core
const cp = require('child_process');
const path = require('path');
const fs = require('fs');
const util = require('util');

//npm
const dashdash = require('dashdash');
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

const options = require('./lib/cmd-line-opts').default;

let opts, parser = dashdash.createParser({options: options});

try {
  opts = parser.parse(process.argv);
} catch (e) {
  console.error(' => CLI parsing error: %s', e.message);
  process.exit(1);
}

if (opts.version) {
  let npmLinkUpPkg = require('./package.json');
  console.log(npmLinkUpPkg.version);
  process.exit(0);
}

if (opts.help) {
  let help = parser.help({includeEnv: true}).trimRight();
  console.log('usage: node foo.js [OPTIONS]\n'
    + 'options:\n'
    + help);
  process.exit(0);
}

if (opts.completion) {
  let generatedBashCode = dashdash.bashCompletionFromOptions({
    name: 'npmlinkup',
    options: options,
    includeHidden: true
  });
  console.log(generatedBashCode);
  process.exit(0);
}

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

// let schema = require('./schemas/npm-link-up-schema.json');
// let Ajv = require('ajv');
// let ajv = new Ajv(); // options can be passed, e.g. {allErrors: true}
// let validate = ajv.compile(schema);

const NLU = require('./schemas/npm-link-up-schema');
new NLU(conf, false).validate();

const name = pkg.name;

if (!name) {
  console.error(' => Ummmm, your package.json file does not have a name property. Fatal.');
  return process.exit(1);
}

const deps =
  Object.keys(pkg.dependencies || {})
    .concat(Object.keys(pkg.devDependencies || {}))
    .concat(Object.keys(pkg.optionalDependencies || {}));

if (!deps.length) {
  console.error(' => Ummmm, your package.json file does not have any dependencies listed.');
  return process.exit(0);
}

let list = conf.list;

if (list.length < 1) {
  console.error('\n', colors.magenta(' => You do not have any dependencies listed in your npm-link-up.json file.'));
  console.log('\n\n', colors.cyan.bold(util.inspect(conf)));
  return process.exit(1);
}

let searchRoots;

if (opts.search_root && opts.search_root.length > 0) {
  searchRoots = opts.search_root.filter(function (item, i, arr) {
    return arr.indexOf(item) === i;  // get a unique list
  });
}
else {

  if (!conf.searchRoots) {
    console.error(' => Warning => no "searchRoots" property provided in npm-link-up.json file. ' +
      'NPM-Link-Up will therefore search through your entire home directory.');
    if (opts.force) {
      searchRoots = [path.resolve(process.env.HOME)];
    }
    else {
      console.error(' => You must use --force to do this.');
      process.exit(1);
    }
  }

  searchRoots = (conf.searchRoots || []).concat(opts.search_root_append || []).filter(function (item, i, arr) {
    return arr.indexOf(item) === i;  // get a unique list
  });
}

const inListButNotInDeps = [];
const inListAndInDeps = list.filter(function (item) {
  if (!deps.includes(item)) {
    inListButNotInDeps.push(item);
    return false;
  }
  return true;
});

inListButNotInDeps.forEach(function (item) {
  console.error(colors.red.bold(' => Warning => The following item was listed in your npm-link-up.json file,\n' +
    'but is not listed in your package.json dependencies => "' + item + '".'));
});

// always push the very project's name
list.push(name);

list = list.filter(function (item, index) {
  return list.indexOf(item) === index;
});

const alwaysIgnoreThese = require('./lib/always-ignore').default;

const ignore = (conf.ignore || []).concat(alwaysIgnoreThese).filter(function (item, index, arr) {
  return arr.indexOf(item) === index;
}).map(function (item) {
  return new RegExp(item);
});

function isIgnored (pth) {
  return ignore.some(function (r) {
    if (r.test(pth)) {
      if (opts.verbosity > 2) {
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

const {stdout, stderr} = require('./lib/streaming');

if (opts.inherit_log) {
  stdout.pipe(process.stdout);
  stderr.pipe(process.stderr);
}

if (opts.log) {
  stdout.pipe(fs.createWriteStream(path.resolve(root + '/npm-link-up.log')));
  stderr.pipe(fs.createWriteStream(path.resolve(root + '/npm-link-up.log')));
}

const map = {};

console.log('this map');

async.autoInject({

  npmCacheClean: function (cb) {

    if (!opts.clear_all_caches) {
      return process.nextTick(cb);
    }

    const k = cp.spawn('bash', [], {
      NPM_LINK_UP: 'yes'
    });

    k.stdin.write('\n' + 'npm cache clean; yarn cache clean' + '\n');

    process.nextTick(function () {
      k.stdin.end();
    });

    k.stdout.setEncoding('utf8');
    k.stderr.setEncoding('utf8');
    k.stderr.pipe(process.stderr);
    k.once('error', cb);

    k.once('close', function (code) {
      code > 0 ? cb({path: 'npm cache clean', code: code}) : cb();
    });

  },

  searchRoots: function (npmCacheClean, cb) {

    const mappedRoots = searchRoots.map(function (v) {
      return `echo "${v}";`;
    });

    const k = cp.spawn('bash', [], {
      NPM_LINK_UP: 'yes'
    });

    k.stdin.write('\n' + mappedRoots.join(' ') + '\n');

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

      (function getMarkers (dir, cb) {

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
                console.log(' => [npm-link-up internal] => probably a symlink? => ', item);
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

                  let isNodeModulesPresent = false;

                  try {
                    isNodeModulesPresent = fs.statSync(path.resolve(dirname + '/node_modules')).isDirectory();
                  }
                  catch (e) {
                    //ignore
                  }

                  let isAtLinkShPresent = false;

                  try {
                    isAtLinkShPresent = fs.statSync(path.resolve(dirname + '/@link.sh')).isFile();
                  }
                  catch (e) {
                    //ignore
                  }

                  if (list.includes(pkg.name)) {

                    let deps = Object.keys(pkg.dependencies || {})
                      .concat(Object.keys(pkg.devDependencies || {}))
                      .concat(Object.keys(pkg.optionalDependencies || {}));

                    deps = deps.filter(function (d) {
                      return list.includes(d);
                    });

                    map[pkg.name] = {
                      name: pkg.name,
                      linkToItself: npmlinkup && npmlinkup.linkToItself,
                      runInstall: !isNodeModulesPresent,
                      hasAtLinkSh: isAtLinkShPresent,
                      path: dirname,
                      deps: deps
                    };
                  }
                }

                cb();
              }
              else if (stats.isDirectory()) {
                if (isIgnored(String(item))) {
                  if (opts.verbosity > 2) {
                    console.log(' => Warning => node_modules/.git path ignored => ', item);
                  }
                  cb();
                }
                else {
                  // continue drilling down
                  getMarkers(item, cb);
                }
              }
              else {
                if (opts.verbosity > 1) {
                  console.log(' => Not a directory or file (maybe a symlink?) => ', item);
                }
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

    function isAllLinked () {
      //Object.values might not be available on all Node.js versions.
      return Object.keys(map).every(function (k) {
        return map[k].isLinked;
      });
    }

    function areAllLinked (names, n) {
      return names.every(function (name) {
        if (name === n) {
          // handle circular deps
          return true;
        }
        return map[name].isLinked;
      });
    }

    function getCountOfUnlinkedDeps (dep) {
      return dep.deps.filter(function (d) {
        return !d.isLinked;
      }).length;
    }

    function findNextDep () {
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

    function getNPMLinkList (deps) {
      return deps.filter(function (d) {
          if (!map[d]) {
            console.log(' => Map for key ="' + d + '" is not defined.');
            return false;
          }
          else{
            return map[d] && map[d].isLinked;
          }
        })
        .map(function (d) {
          return `npm link ${d}`;
        });
    }

    function getCommandListOfLinked (name) {
      return Object.keys(map)
        .filter(function (k) {
          return map[k].isLinked && map[k].deps.includes(name);
        })
        .map(function (k) {
          return `cd ${map[k].path} && npm link ${name}`;
        });
    }

    console.log('\n');

    function getInstallCommand (dep) {
      if (dep.runInstall || opts.install_all) {
        return '&& rm -rf node_modules && npm install';
      }
    }

    function getLinkToItselfCommand (dep) {
      if (opts.self_link_all || (dep.linkToItself !== false)) {
        return `&& npm link ${dep.name}`
      }
    }

    async.until(isAllLinked, function (cb) {

      if (opts.verbosity > 2) {
        console.log(` => Searching for next dep to run.`);
      }

      const dep = findNextDep();

      if (opts.verbosity > 1) {
        console.log(' => Processing dep with name => ', dep.name);
      }

      const deps = getNPMLinkList(dep.deps);
      const links = deps.length > 0 ? '&& ' + deps.join(' && ') : '';

      const script = [

        `cd ${dep.path}`,
        getInstallCommand(dep),
        links,
        '&& npm link',
        getLinkToItselfCommand(dep)

      ].filter(i => i).join(' ');

      console.log(' => Script is => ', script);
      console.log('\n');

      const k = cp.spawn('bash', [], {
        env: Object.assign({}, process.env, {
          NPM_LINK_UP: 'yes'
        })
      });

      k.stdin.write('\n' + script + '\n');

      stdout.write(`\n\n >>> Beginning of "${dep.name}"...\n\n`);
      stdout.write(`\n\n >>> Running script => "${script}"...\n\n`);

      k.stdout.setEncoding('utf8');
      k.stderr.setEncoding('utf8');
      k.stdout.pipe(stdout, {end: false});
      k.stderr.pipe(stderr, {end: false});

      process.nextTick(function () {
        k.stdin.end();
      });

      let data = '';
      k.stderr.on('data', function (d) {
        data += d;
      });

      k.once('error', cb);

      k.once('close', function (code) {

        if (code > 0 && /ERR/.test(data)) {

          console.log(`\n => Dep with name "${dep.name}" is done, but with an error.\n`);

          cb({
            code: code,
            dep: dep,
            error: data
          });
        }
        else {

          if (data) {
            stderr.write(' => Warning => ' + data);
          }

          if (opts.verbosity > 1) {
            console.log(`\n => Dep with name "${dep.name}" is done.\n`);
          }

          dep.isLinked = map[dep.name].isLinked = true;

          function linkPreviouslyUnlinked (cb) {

            const cmds = getCommandListOfLinked(dep.name);

            if (!cmds.length) {
              return process.nextTick(cb);
            }

            const cmd = cmds.join(' && ');
            stdout.write(`\n => Running this command for "${dep.name}" =>\n"${cmd}".\n\n\n`);

            const k = cp.spawn('bash', [], {
              env: Object.assign({}, process.env, {
                NPM_LINK_UP: 'yes'
              })
            });

            k.stdin.write('\n' + cmd + '\n');

            k.stdout.setEncoding('utf8');
            k.stderr.setEncoding('utf8');
            k.stdout.pipe(stdout, {end: false});
            k.stderr.pipe(stderr, {end: false});

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

  const line = '\n\n => NPM-Link-Up run was successful. All done.\n\n';
  stdout.write(line);
  stdout.end();
  stderr.end();
  console.log(line);

  setTimeout(function () {
    process.exit(0);
  }, 100);

});








