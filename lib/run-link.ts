import {INPMLinkUpMap, INPMLinkUpMapItem, INPMLinkUpOpts} from "../index";

//core
import * as util from 'util';
import * as assert from 'assert';
import * as path from 'path';
import * as EE from 'events';
import * as fs from 'fs';
import * as stream from 'stream';
import * as cp from 'child_process';

//npm
import * as chalk from 'chalk';
const dashdash = require('dashdash');
const async = require('async');
const residence = require('residence');
const cwd = process.cwd();
const root = residence.findProjectRoot(cwd);
const treeify = require('treeify');
import  {stdoutStrm, stderrStrm} from './streaming';
import {logInfo, logError, logWarning, logVeryGood, logGood} from './logging';

////////////////////////////////////////////////////////////////////////////////////////////

export const runNPMLink =
  function (map: INPMLinkUpMap, totalList: Array<string>, opts: INPMLinkUpOpts, cb: Function) {

    if (opts.treeify) {
      logWarning('given the --treeify option passed at the command line, ' +
        'npm-link-up will only print out the dependency tree and exit.');
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
      return cb(new Error(' => No deps could be found.'));
    }

    logGood('=> Map => \n', chalk.magenta.bold(util.inspect(map)));

    function isAllLinked() {
      //Object.values might not be available on all Node.js versions.
      return Object.keys(map).every(function (k) {
        return map[k].isLinked;
      });
    }

    function getCountOfUnlinkedDeps(dep: INPMLinkUpMapItem) {
      return dep.deps.filter(function (d) {
        if (!map[d]) {
          logWarning(`there is no dependency named ${d} in the map.`);
          return false;
        }
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
            logWarning('Map for key ="' + d + '" is not defined.');
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
        return '&& rm -rf node_modules && npm install --no-optional --log-level=warn --silent';
      }
    }

    function getLinkToItselfCommand(dep: INPMLinkUpMapItem) {
      if (opts.self_link_all || (dep.linkToItself !== false)) {
        return `&& npm link ${String(dep.name).trim()}`
      }
    }

    async.until(isAllLinked, function (cb: Function) {

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

      logInfo(`Script is => "${script}"`);
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

      k.once('exit', function (code) {

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

            k.once('exit', cb);

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

  };