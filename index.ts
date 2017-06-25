#!/usr/bin/env node

//core
import * as util from 'util';
import * as assert from 'assert';
import * as path from 'path';
import * as EE from 'events';
import * as fs from 'fs';
import * as stream from 'stream';
import * as cp from 'child_process';

//npm
const dashdash = require('dashdash');
const colors = require('colors/safe');
const async = require('async');
const residence = require('residence');
const cwd = process.cwd();
const root = residence.findProjectRoot(cwd);
const treeify = require('treeify');
import  {stdoutStrm, stderrStrm} from './lib/streaming';

//project
import {makeFindProject} from './lib/find-projects';
import {mapPaths} from './lib/map-paths-with-env-vars';
import {cleanCache} from './lib/cache-clean';
import alwaysIgnoreThese  from './lib/always-ignore';
import {logInfo, logError, logWarning, logVeryGood, logGood} from './lib/logging';

//////////////////////////////////////////////////////////////////////////

process.once('exit', function (code) {
  console.log('\n\n => NPM-Link-Up is exiting with code => ', code, '\n');
});

//////////////////////////////////////////////////////////////

export interface INPMLinkUpOpts {
  verbosity: number,
  version: string,
  help: boolean,
  completion: boolean,
  treeify: boolean
}

const options = require('./lib/cmd-line-opts').default;

let opts: INPMLinkUpOpts, parser = dashdash.createParser({options: options});

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

const isTreeify = opts.treeify;

export interface INPMLinkUpVisualTree {
  [key: string]: INPMLinkUpVisualTree
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

const NLU = require('./schemas/npm-link-up-schema');
new NLU(conf, false).validate();

const name = pkg.name;

if (!name) {
  console.error(' => Ummmm, your package.json file does not have a name property. Fatal.');
  process.exit(1);
}

const deps = Object.keys(pkg.dependencies || {})
  .concat(Object.keys(pkg.devDependencies || {}))
  .concat(Object.keys(pkg.optionalDependencies || {}));

let list = conf.list;

if (list.length < 1) {
  console.error('\n', colors.magenta(' => You do not have any dependencies listed in your npm-link-up.json file.'));
  console.log('\n\n', colors.cyan.bold(util.inspect(conf)));
  process.exit(1);
}

let searchRoots: Array<string>;

if (opts.search_root && opts.search_root.length > 0) {
  searchRoots = opts.search_root.filter(function (item: string, i: number, arr: Array<string>) {
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

  searchRoots = (conf.searchRoots || []).concat(opts.search_root_append || [])
    .filter(function (item: string, i: number, arr: Array<string>) {
      return arr.indexOf(item) === i;  // get a unique list
    });
}

const inListButNotInDeps: Array<string> = [];
const inListAndInDeps = list.filter(function (item: string) {
  if (!deps.includes(item)) {
    inListButNotInDeps.push(item);
    return false;
  }
  return true;
});

inListButNotInDeps.forEach(function (item) {
  logWarning('warning, the following item was listed in your npm-link-up.json file,\n' +
    'but is not listed in your package.json dependencies => "' + item + '".');
});

// we need to store a version of the list without the top level package's name
const originalList = list.slice(0);

// always push the very project's name
list.push(name);

list = list.filter(function (item: string, index: number) {
  return list.indexOf(item) === index;
});

const totalList: Array<string> = list.slice(0);

const ignore = (conf.ignore || []).concat(alwaysIgnoreThese)
  .filter(function (item: string, index: number, arr: Array<string>) {
    return arr.indexOf(item) === index;
  }).map(function (item: string) {
    return new RegExp(item);
  });

function isIgnored(pth: string) {
  return ignore.some(function (r: RegExp) {
    if (r.test(pth)) {
      if (opts.verbosity > 2) {
        console.log(`\n=> Path with value ${pth} was ignored because it matched the following regex:\n${r}`);
      }
      return true;
    }
  });
}

if (ignore.length > 0) {
  console.log('\n => NPM Link Up will ignore paths that match any of the following => ');
  ignore.forEach(function (item: RegExp) {
    console.log(colors.gray.bold(item));
  });
}

console.log('\n');

originalList.forEach(function (item: string) {
  logGood(`The following dep will be NPM link\'ed to this project => "${item}".`);
});

console.log('\n');

if (opts.inherit_log) {
  stdoutStrm.pipe(process.stdout);
  stderrStrm.pipe(process.stderr);
}

if (opts.log) {
  stdoutStrm.pipe(fs.createWriteStream(path.resolve(root + '/npm-link-up.log')));
  stderrStrm.pipe(fs.createWriteStream(path.resolve(root + '/npm-link-up.log')));
}

export interface INPMLinkUpMapItem {
  name: string,
  hasNPMLinkUpJSONFile: boolean,
  linkToItself: boolean,
  runInstall: boolean,
  hasAtLinkSh: boolean,
  path: string,
  deps: Array<string>
  isLinked?: boolean
}

export interface INPMLinkUpMap {
  [key: string]: INPMLinkUpMapItem
}

const map: INPMLinkUpMap = {};

async.autoInject({

  npmCacheClean: function (cb) {

    if (!opts.clear_all_caches) {
      return process.nextTick(cb);
    }

    cleanCache(cb);

  },

  searchRoots: function (npmCacheClean: any, cb: Function) {
    mapPaths(searchRoots, cb);
  },

  findItems: function (searchRoots: Array<string>, cb: Function) {

    console.log('\n');
    logInfo('Searching these roots => \n', colors.magenta(searchRoots));

    const q = async.queue(function(task: Function, cb: Function) {
           task(cb);
    }, 2);

    q.once('drain', cb);

    const createTask = function(searchRoot: string){
      return function(cb: Function){
         findProject(searchRoot, cb);
      }
    };

    searchRoots.forEach(function(sr){
       q.push(createTask(sr));
    });


  },

  runUtility: function (findItems: void, cb: Function) {

    if (opts.treeify) {
      return process.nextTick(cb);
    }

    Object.keys(map).filter(function (k) {
      return totalList.indexOf(k) < 0;
    }).forEach(function (k) {
      // we don't need these keys, this operation should be safe
      delete map[k];
    });

    const keys = Object.keys(map);

    if (!keys.length) {
      console.error(' => No deps could be found.');
      return process.exit(1);
    }

    logGood('=> Map => \n', colors.magenta.bold(util.inspect(map)));

    function isAllLinked() {
      //Object.values might not be available on all Node.js versions.
      return Object.keys(map).every(function (k) {
        return map[k].isLinked;
      });
    }

    function getCountOfUnlinkedDeps(dep: INPMLinkUpMapItem) {
      return dep.deps.filter(function (d) {
        return !map[d].isLinked;
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

    function getNPMLinkList(deps: Array<string>) {
      return deps.filter(function (d) {
          if (!map[d]) {
            console.log(' => Map for key ="' + d + '" is not defined.');
            return false;
          }
          else {
            return map[d] && map[d].isLinked;
          }
        })
        .map(function (d: string) {
          return `npm link ${d}`;
        });
    }

    function getCommandListOfLinked(name: string) {
      return Object.keys(map)
        .filter(function (k) {
          return map[k].isLinked && map[k].deps.includes(name);
        })
        .map(function (k) {
          return `cd ${map[k].path} && npm link ${name}`;
        });
    }

    console.log('\n');

    function getInstallCommand(dep: INPMLinkUpMapItem) {
      if (dep.runInstall || opts.install_all) {
        return '&& rm -rf node_modules && npm install';
      }
    }

    function getLinkToItselfCommand(dep: INPMLinkUpMapItem) {
      if (opts.self_link_all || (dep.linkToItself !== false)) {
        return `&& npm link ${dep.name}`
      }
    }

    async.until(isAllLinked, function (cb) {

      if (opts.verbosity > 2) {
        logInfo(`Searching for next dep to run.`);
      }

      const dep = findNextDep();

      if (opts.verbosity > 1) {
        logGood('Processing dep with name => ', dep.name);
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

      logInfo('Script is => ', script);
      console.log('\n');

      const k = cp.spawn('bash', [], {
        env: Object.assign({}, process.env, {
          NPM_LINK_UP: 'yes'
        })
      });

      k.stdin.write('\n' + script + '\n');

      stdoutStrm.write(`\n\n >>> Beginning of "${dep.name}"...\n\n`);
      stdoutStrm.write(`\n\n >>> Running script => "${script}"...\n\n`);

      k.stdout.setEncoding('utf8');
      k.stderr.setEncoding('utf8');
      k.stdout.pipe(stdoutStrm, {end: false});
      k.stderr.pipe(stderrStrm, {end: false});

      process.nextTick(function () {
        k.stdin.end();
      });

      let stderr = '';
      k.stderr.on('data', function (d) {
        stderr += d;
      });

      k.once('error', cb);

      k.once('close', function (code) {

        if (code > 0 && /ERR/i.test(stderr)) {

          console.log('\n');
          logError(`Dep with name "${dep.name}" is done, but with an error.`);

          cb({
            code: code,
            dep: dep,
            error: stderr
          });
        }
        else {

          if (opts.verbosity > 1) {
            logGood(`Dep with name "${dep.name}" is done.\n`);
            console.log('\n');
          }

          dep.isLinked = map[dep.name].isLinked = true;

          const linkPreviouslyUnlinked = function (cb: Function) {

            const cmds = getCommandListOfLinked(dep.name);

            if (!cmds.length) {
              return process.nextTick(cb);
            }

            const cmd = cmds.join(' && ');
            stdoutStrm.write(`\n => Running this command for "${dep.name}" =>\n"${cmd}".\n\n\n`);

            const k = cp.spawn('bash', [], {
              env: Object.assign({}, process.env, {
                NPM_LINK_UP: 'yes'
              })
            });

            k.stdin.write('\n' + cmd + '\n');

            k.stdout.setEncoding('utf8');
            k.stderr.setEncoding('utf8');
            k.stdout.pipe(stdoutStrm, {end: false});
            k.stderr.pipe(stderrStrm, {end: false});

            process.nextTick(function () {
              k.stdin.end();
            });

            k.once('close', cb);

          };

          linkPreviouslyUnlinked(function (err: Error) {
            cb(err, {
              code: code,
              dep: dep,
              error: stderr
            });
          });

        }
      });

    }, cb);
  }

}, function (err: Error) {

  if (err) {
    console.error(err.stack || err);
    return process.exit(1);
  }

  // console.log(util.inspect(map));

  let tree: INPMLinkUpVisualTree = {
    [name]: {}
  };

  let createItem = function (key: string, obj: INPMLinkUpVisualTree, keys: Array<string>) {

    obj[key] = {};

    if (map[key]) {
      map[key].deps.forEach(function (d: string) {

        if (key !== d && keys.indexOf(d) < 0) {
          keys.push(d);
          let v2 = obj[key][d] = {};
          createItem(d, v2, keys.slice(0));
        }
        else {
          // keys.push(d);
          obj[key][d] = null;
        }

      });
    }
    else {
      logWarning(`no key named "${key}" in map.`);
    }

  };

  originalList.forEach(function (k: string) {
    createItem(k, tree[name], [name]);
  });

  const line = colors.green(' => NPM-Link-Up run was successful. All done.');
  stdoutStrm.write(line);
  stdoutStrm.end();
  stderrStrm.end();
  console.log(line);

  console.log('\n');
  logGood('NPM-Link-Up results as a visual:\n');
  console.log(treeify.asTree(tree, true));

  setTimeout(function () {
    process.exit(0);
  }, 100);

});








