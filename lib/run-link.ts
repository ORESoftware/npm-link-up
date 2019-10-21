'use strict';

import {EVCb, NluMap, NluMapItem} from "./index";

//core
import * as util from 'util';
import * as cp from 'child_process';
import * as fs from 'fs';

//npm
import chalk from 'chalk';
import async = require('async');

//project
import log from './logging';
import {determineIfReinstallIsNeeded, flattenDeep, getDevKeys, getPath} from "./utils";
import * as path from "path";

interface BinFieldObject {
  [key: string]: string
}

///////////////////////////////////////////////////////////////////////////////////////////

export const runNPMLink = (map: NluMap, opts: any, cb: EVCb<null>) => {
  
  const keys = Object.keys(map);
  
  if (keys.length < 1) {
    return process.nextTick(cb, 'NLU could not find any dependencies on the filesystem;' +
      ' perhaps broaden your search using the --search-root option. Or use --every instead of --all.');
  }
  
  if (opts.dry_run) {
    log.warning('given the --treeify option passed at the command line, npm-link-up will only print out the dependency tree and exit.');
    log.veryGood('the following is a complete list of recursively related dependencies:\n');
    log.veryGood(util.inspect(Object.keys(map)));
    return process.nextTick(cb);
  }
  
  if (opts.verbosity > 2) {
    log.info('Dependency map:');
  }
  
  for (let k of Object.keys(map)) {
    if (opts.verbosity > 2) {
      log.info('Info for project:', chalk.bold(k));
      console.log(chalk.green.bold(util.inspect(map[k])));
      console.log();
    }
  }
  
  const isAllLinked = function () {
    //Object.values might not be available on all Node.js versions.
    return Object.values(map).every(v => v.isLinked);
  };
  
  const getCountOfUnlinkedDeps = (dep: NluMapItem) => {
    return dep.deps.filter(d => !dep.installedSet.has(d)).length;
  };
  
  const findNextDep = function () {
    // not anymore: this routine finds the next dep, that has no deps or no unlinked dependencies
    // this routine finds the next dep with the fewest number of unlinked dependencies
    
    let dep;
    let count = Number.MAX_SAFE_INTEGER;
    
    for (let d of Object.values(map)) {
      if (!d.isLinked) {
        if (getCountOfUnlinkedDeps(d) < count) {
          dep = d;
          count = dep.deps.length;
        }
      }
    }
    
    if (!dep) {
      log.error(
        'Internal implementation error => no dep found, but there should be at least one yet-to-be-linked dep.'
      );
      return process.exit(1);
    }
    
    return dep;
  };
  
  const getNPMLinkList = (dep: NluMapItem): Array<string> => {
    
    if (opts.umbrella && dep.isMainProject) {
      return [];
    }
    
    const deps = dep.deps.map(getPath(map, dep, opts)); // map from package name to the desired package path
    
    const isAccessible = (path: string) => {
      const searchRoots = dep.searchRoots;
      const matched = searchRoots.some(r => path.startsWith(r));
      
      if (!matched) {
        log.error(`The following dep ${chalk.gray.bold(path)}`,
          `is not accessible for project at path: ${chalk.gray.bold(dep.path)}`);
        log.error(`The available searchRoots are:`, JSON.stringify(searchRoots));
      }
      
      return matched;
    };
    
    return deps.filter(Boolean).filter(d => {
        
        if (!map[d]) {
          log.warning('Map for key => "' + d + '" is not defined.');
          return false;
        }
        return map[d] && map[d].isLinked && isAccessible(map[d].path);
      })
      .map((d: string) => {
        
        const {path, name, bin} = map[d];
        
        if (dep.installedSet.has(name)) {
          throw new Error('Already installed a package with name: ' + name + ', into dep: ' + util.inspect(dep));
        }
        
        dep.installedSet.add(name);
        
        if (dep.linkedSet[path]) {
          throw new Error(`Already linked ${path} to dep: ` + util.inspect(dep));
        }
        
        dep.linkedSet[path] = map[d];
        
        if (path !== d) {
          throw new Error('The "path" field and the map entry should be the same.');
        }
        // return ` npm link ${d} -f `;
        return ` mkdir -p "node_modules/${name}" &&
                 rm -rf "node_modules/${name}" &&
                 mkdir -p "node_modules/${name}" &&
                 rm -rf "node_modules/${name}"  &&
                 ln -sf "${path}" "node_modules/${name}" ${getBinMap(bin, path, name)} `;
      });
    
  };
  
  const getBinMap = (bin: string | BinFieldObject, path: string, name: string) => {
    
    if (!bin) {
      return '';
    }
    
    if (typeof bin === 'string') {
      return ` && mkdir -p "node_modules/.bin" && ln -sf "${path}/${bin}" "node_modules/.bin/${name}" `
    }
    
    const keys = Object.keys(bin);
    
    if (keys.length < 1) {
      return '';
    }
    
    return ` && ` + keys.map(k => {
        return ` mkdir -p "node_modules/.bin" && ln -sf "${path}/${bin[k]}" "node_modules/.bin/${k}" `
      })
      .join(' && ');
  };
  
  const getCommandListOfLinked = (dep: NluMapItem) : Array<string> => {
    
    const name = dep.name;
    const path = dep.path;
    const bin = map[path] && map[path].bin;
    
    if (!path) {
      log.error(`missing "path" field for dependency with name "${name}"`);
      return process.exit(1);
    }
    
    if (!bin) {
      opts.verbosity > 3 && log.warn(`No "bin" field for dependency with name "${name}"`);
    }
    
    if (dep.bin !== bin) {
      throw new Error('"bin" fields do not match => ' + util.inspect(dep));
    }
  
    if (opts.umbrella && dep.isMainProject === true) {
      return [];
    }
    
    
    const isAccessible = (dep: NluMapItem) => {
      const searchRoots = dep.searchRoots;
      if(opts.umbrella && dep.isMainProject){
        return false;
      }
      return searchRoots.some(r => path.startsWith(r));
    };
    
    return Object.keys(map).filter(k => {
        return map[k].isLinked && map[k].deps.includes(name) && isAccessible(map[k]);
      })
      .map(k => {
        
        const p = `${map[k].path}`;
        
        if (map[k].installedSet.has(name)) {
          throw new Error('Already installed a package with name: ' + name + ', into dep: ' + util.inspect(map[k]));
        }
        
        map[k].installedSet.add(name);
        
        if (map[k].linkedSet[path]) {
          throw new Error(`Already linked ${path} to dep: ` + util.inspect(map[k]));
        }
        
        map[k].linkedSet[path] = dep;
        
        if (p !== k) {
          throw new Error(`Paths should be the same: [1] '${p}', [2] '${k}'.`);
        }
        return ` cd "${p}" &&
               mkdir -p "node_modules/${name}" &&
               rm -rf "node_modules/${name}" &&
               mkdir -p "node_modules/${name}" &&
               rm -rf "node_modules/${name}" &&
               ln -sf "${path}" "node_modules/${name}"  ${getBinMap(bin, path, name)} `;
      });
  };
  
  const getInstallCommand = (dep: NluMapItem) => {
    
    if (opts.umbrella && dep.isMainProject === true) {
      return;
    }
    
    if (opts.no_install) {
      return;
    }
    
    if (dep.runInstall || opts.install_all || (dep.isMainProject && opts.install_main)) {
      const installProd = opts.production ? ' --production ' : '';
      return ` && rm -rf node_modules && npm install --cache-min 999999 --loglevel=warn ${installProd}`;
    }
  };
  
  const getLinkToItselfCommand = (dep: NluMapItem) => {
    
    if (opts.umbrella && dep.isMainProject) {
      return;
    }
    
    if (opts.no_link) {
      return;
    }
    
    if (opts.self_link_all || dep.linkToItself === true) {
      return ` && mkdir -p "node_modules/${dep.name}" ` +
        ` && rm -rf "node_modules/${dep.name}" && mkdir -p "node_modules/${dep.name}" ` +
        ` && rm -rf "node_modules/${dep.name}" ` +
        ` && ln -sf "${dep.path}" "node_modules/${dep.name}" `;
    }
  };
  
  const getGlobalLinkCommand = (dep: NluMapItem) => {
    
    if (opts.umbrella && dep.isMainProject) {
      return;
    }
    
    if (opts.no_link) {
      return;
    }
    
    
    if (opts.link_all || (dep.isMainProject && opts.link_main)) {
      const installProd = opts.production ? ' --production ' : '';
      return ` && mkdir -p "node_modules/.bin" && npm link --cache-min 999999 -f ${installProd} `;
    }
  };
  
  async.until(isAllLinked, (cb: EVCb<any>) => {
    
    if (opts.verbosity > 2) {
      log.info(`Searching for next dep to run.`);
    }
    
    const dep = findNextDep();
    
    if (opts.verbosity > 1) {
      log.info(`Processing dep with name => '${chalk.bold(dep.name)}'.`);
    }
    
    const nm = path.resolve(dep.path + '/node_modules');
    
    determineIfReinstallIsNeeded(nm, dep, getDevKeys(dep.package), opts, (err, val) => {
      
      if (err) {
        log.warn(`Error generated from determining if npm (re)install was is necessary for package: ${dep.name} =>`, err);
      }
      
      if (val === true) {
        dep.runInstall = true;
      }
      
      const deps = getNPMLinkList(dep);
      const links = deps.length > 0 ? ' && ' + deps.join(' && ') : '';
      
      const script = [
        `cd "${dep.path}"`,
        getInstallCommand(dep),
        getGlobalLinkCommand(dep),
        links,
        getLinkToItselfCommand(dep)
      ]
        .filter(Boolean)
        .join(' ');
      
      if (opts.verbosity > 2) {
        log.info(`First-pass script is => "${chalk.blueBright.bold(script)}"`);
      }
      
      const k = cp.spawn('bash', [], {
        env: Object.assign({}, process.env, {
          NPM_LINK_UP: 'yes'
        })
      });
      
      k.stdin.end(script);
      
      k.stdout.setEncoding('utf8');
      k.stderr.setEncoding('utf8');
      
      k.stderr.pipe(process.stderr);
      
      if (opts.verbosity > 2) {
        k.stdout.pipe(process.stdout);
      }
      
      let stderr = '';
      k.stderr.on('data', function (d) {
        stderr += d;
      });
      
      k.once('error', cb);
      
      k.once('exit', code => {
        
        if (code > 0 && /ERR/i.test(stderr)) {
          log.error(`Dep with name "${dep.name}" is done, but with an error.`);
          return cb({code, dep, error: stderr});
        }
        
        dep.isLinked = map[dep.path].isLinked = true;
        
        const linkPreviouslyUnlinked = function (cb: EVCb<any>) {
          
          const cmds = getCommandListOfLinked(dep);
          
          if (!cmds.length) {
            return process.nextTick(cb);
          }
          
          const cmd = cmds.join(' && ');
          
          if (opts.verbosity > 2) {
            log.info(`Running this command for "${chalk.bold(dep.name)}" => '${chalk.blueBright(cmd)}'.`);
          }
          
          const k = cp.spawn('bash', [], {
            env: Object.assign({}, process.env, {
              NPM_LINK_UP: 'yes'
            })
          });
          
          k.stdin.write(cmd);
          
          k.stdout.setEncoding('utf8');
          k.stderr.setEncoding('utf8');
          
          k.stderr.pipe(process.stderr, {end: false});
          
          if (opts.verbosity > 2) {
            k.stdout.pipe(process.stdout, {end: false});
          }
          
          k.stdin.end();
          k.once('exit', cb);
          
        };
        
        linkPreviouslyUnlinked((err: any) => {
          
          if (err) {
            log.error(`Dep with name "${dep.name}" is done, but with an error => `, err.message || err);
          } else if (opts.verbosity > 1) {
            log.veryGood(`Dep with name '${chalk.bold(dep.name)}' is done.`);
          }
          
          cb(err, {
            code: code,
            dep: dep,
            error: stderr
          });
          
        });
        
      });
      
    });
    
  }, cb);
  
};
