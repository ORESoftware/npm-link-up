'use strict';

import {INPMLinkUpMap, INPMLinkUpMapItem, INPMLinkUpOpts} from "./npmlinkup";

//core
import * as util from 'util';
import * as cp from 'child_process';

//npm
import chalk from 'chalk';
import async = require('async');

//project
import log from './logging';

///////////////////////////////////////////////////////////////////////////////////////////

export const runNPMLink =
  function (map: INPMLinkUpMap, totalList: Map<string, boolean>, opts: INPMLinkUpOpts, cb: Function): void {

    const keys = Object.keys(map);

    if (keys.length < 1) {
      return process.nextTick(cb, new Error('NLU could not find any dependencies on the filesystem;' +
        ' perhaps broaden your search using searchRoots.'));
    }

    if (opts.treeify) {
      log.warning('given the --treeify option passed at the command line, npm-link-up will only print out the dependency tree and exit.');
      log.veryGood('the following is a complete list of recursively related dependencies:\n');
      log.veryGood(util.inspect(Object.keys(map)));
      return process.nextTick(cb);
    }

    console.log('\n');
    log.good('Dependency map:');
    Object.keys(map).forEach(function (k) {
      log.info('Info for project:', chalk.bold(k));
      console.log(chalk.green.bold(util.inspect(map[k])));
      console.log();
    });

    // log.good(chalk.green.bold(util.inspect(map)));

    const isAllLinked = function () {
      //Object.values might not be available on all Node.js versions.
      return Object.keys(map).every(function (k) {
        return map[k].isLinked;
      });
    };

    function getCountOfUnlinkedDeps(dep: INPMLinkUpMapItem) {
      return dep.deps.filter(function (d) {
        if (!map[d]) {
          log.warning(`there is no dependency named ${d} in the map.`);
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
          log.warning('Map for key ="' + d + '" is not defined.');
          return false;
        }
        return map[d] && map[d].isLinked;
      })
      .map(function (d: string) {
        return ` npm link ${d} -f `;
      });
    }

    function getCommandListOfLinked(name: string) {
      return Object.keys(map).filter(function (k) {
        return map[k].isLinked && map[k].deps.includes(name);
      })
      .map(function (k) {
        return ` cd ${map[k].path} && npm link ${name} -f `;
      });
    }

    console.log('\n');

    function getInstallCommand(dep: INPMLinkUpMapItem) {
      if (dep.runInstall || opts.install_all) {
        return ' && rm -rf node_modules && npm install --silent ';
        // return '&& rm -rf node_modules;';
      }
    }

    // function getInstallCommand(dep: INPMLinkUpMapItem) {
    //   if (dep.runInstall || opts.install_all) {
    //     return '&& rm -rf node_modules';  // we do not need to run npm install, npm link already does this
    //   }
    // }

    function getLinkToItselfCommand(dep: INPMLinkUpMapItem) {
      if (opts.self_link_all || (dep.linkToItself !== false)) {
        return `&& npm link ${String(dep.name).trim()} -f`
      }
    }

    async.until(isAllLinked, function (cb: Function) {

      if (opts.verbosity > 2) {
        log.info(`Searching for next dep to run.`);
      }

      const dep = findNextDep();

      if (opts.verbosity > 1) {
        log.good(`Processing dep with name => '${chalk.bold(dep.name)}'.`);
      }

      const deps = getNPMLinkList(dep.deps);
      const links = deps.length > 0 ? '&& ' + deps.join(' && ') : '';

      const script = [
        `cd ${dep.path}`,
        getInstallCommand(dep),
        links,
        '&& npm link -f',
        getLinkToItselfCommand(dep)
      ]
      .filter(Boolean)
      .join(' ');

      log.info(`Script is => "${script}"`);

      const k = cp.spawn('bash', [], {
        env: Object.assign({}, process.env, {
          NPM_LINK_UP: 'yes'
        })
      });

      k.stdin.end('\n' + script + '\n');

      k.stdout.setEncoding('utf8');
      k.stderr.setEncoding('utf8');

      if (false) {
        k.stdout.pipe(process.stdout, {end: false});
        k.stderr.pipe(process.stderr, {end: false});
      }

      let stderr = '';
      k.stderr.on('data', function (d) {
        stderr += d;
      });

      k.once('error', cb);

      k.once('exit', function (code) {

        if (code > 0 && /ERR/i.test(stderr)) {
          console.log('\n');
          log.error(`Dep with name "${dep.name}" is done, but with an error.`);
          return cb({code, dep, error: stderr});
        }

        if (opts.verbosity > 1) {
          log.veryGood(`Dep with name '${chalk.bold(dep.name)}' is done.`);
        }

        dep.isLinked = map[dep.name].isLinked = true;

        const linkPreviouslyUnlinked = function (cb: Function) {

          const cmds = getCommandListOfLinked(dep.name);

          if (!cmds.length) {
            return process.nextTick(cb);
          }

          const cmd = cmds.join(' && ');
          process.stdout.write(` => Running this command for "${dep.name}" =>\n"${cmd}".\n`);

          const k = cp.spawn('bash', [], {
            env: Object.assign({}, process.env, {
              NPM_LINK_UP: 'yes'
            })
          });

          k.stdin.write('\n' + cmd + '\n');

          k.stdout.setEncoding('utf8');
          k.stderr.setEncoding('utf8');

          if (false) {
            k.stdout.pipe(process.stdout, {end: false});
            k.stderr.pipe(process.stderr, {end: false});
          }

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

      });

    }, cb);

  };
