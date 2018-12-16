'use strict';

import * as path from "path";
import * as assert from "assert";
import * as fs from "fs";
import log from "../../logging";
import chalk from "chalk";
import {NLURunOpts} from "../run/cmd-line-opts";
import {EVCb, NluGlobalSettingsConf} from "../../index";
import options from "../run/cmd-line-opts";

const dashdash = require('dashdash');
import * as async from 'async';
import {handleConfigCLIOpt} from '../../utils';

const treeify = require('treeify');

const allowUnknown = process.argv.indexOf('--allow-unknown') > 0;
let opts: NLURunOpts, globalConf: NluGlobalSettingsConf, parser = dashdash.createParser({options, allowUnknown});

try {
  opts = parser.parse(process.argv);
} catch (e) {
  log.error(chalk.magenta('CLI parsing error:'), chalk.magentaBright.bold(e.message));
  process.exit(1);
}

if (opts.help) {
  let help = parser.help({includeEnv: true}).trimRight();
  console.log('usage: nlu run [OPTIONS]\n'
    + 'options:\n'
    + help);
  process.exit(0);
}

const cwd = process.cwd();
let {nluFilePath} = handleConfigCLIOpt(cwd,opts);

const searchRoot = process.cwd();
log.info('Searching for symlinked packages in this directory:', searchRoot, '\n');

type Task = (cb: EVCb<any>) => void;
const queue = async.queue<Task, any>((task, cb) => task(cb), 8);

let key = `${path.basename(searchRoot)} (root)`;
const treeObj = {[key]: {}};

const ignore = new Set(['.git', '.idea', '.r2g', 'dist', 'build', '.vscode']);

const searchDir = (dir: string, node: any, cb: EVCb<null>) => {

  const handleSymbolicLink = (itemPath: string, name: string, cb: EVCb<null>) => {

    // this checks if the symbolic link points to a directory or not
    fs.stat(itemPath, (err, stats) => {

      if (err) {
        log.warning(err);
        return cb(null);
      }

      if (!stats.isDirectory()) {
        log.warning('Symbolic link in node_modules points to a non-directory:', itemPath);
        return cb(null);
      }

      fs.realpath(itemPath, (err, p) => {

        if (err) {
          log.warning(err);
          return cb(null);
        }

        node[name] = chalk.bold('❖ ') + chalk.underline(p) + ' ';
        cb(null);
      });
    });

  };

  const handleOrg = (orgDir: string, orgName: string, cb: EVCb<null>) => {

    fs.readdir(orgDir, (err, items) => {

      if (err) {
        log.warning(err.message);
        return cb(null);
      }

      async.eachLimit(items, 8, (v, cb) => {

        const pth = path.resolve(orgDir, v);
        fs.lstat(pth, (err, stats) => {

          if (err) {
            log.warning(err.message);
            return cb(null);
          }

          if (stats.isSymbolicLink()) {
            return handleSymbolicLink(pth, orgName + '/' + v, cb);
          }

          cb(null);

        });

      }, cb);

    });

  };

  queue.push(callback => {

    fs.readdir(dir, (err, items) => {

      callback(null);

      if (err) {
        log.warning(err.message);
        return cb(null);
      }

      const searchable = items.filter(v => !ignore.has(v));

      async.eachLimit(searchable, 8, (v, cb) => {

        const itemPath = path.resolve(dir + '/' + v);
        const parentDir = path.basename(path.dirname(itemPath));
        const nodeModulesIsParent = parentDir === 'node_modules';

        fs.lstat(itemPath, (err, stats) => {

          if (err) {
            log.warning(err.message);
            return cb(null);
          }

          if (stats.isFile()) {
            return cb(null);
          }

          if (nodeModulesIsParent) {

            if (stats.isSymbolicLink()) {
              return handleSymbolicLink(itemPath, v, cb);
            }

            if (stats.isDirectory() && v.startsWith('@')) {
              return handleOrg(itemPath, v, cb);
            }

            return cb(null);
          }

          if (stats.isDirectory()) {
            return searchDir(itemPath, node[v] = {}, cb);
          }

          delete node[v];
          cb(null);

        });

      }, cb);

    });

  });

};

const cleanTree = (treeObj: any) => {

  (function recurse(node: any, parent: any, key: string, hasNodeModules: boolean, list: Array<{ hasNodeModules: boolean }>) {

    if (hasNodeModules) {
      for (let v of list) {
        v.hasNodeModules = true;
      }
    }

    const children = Object.keys(node);

    const x = {
      hasNodeModules: false
    };

    for (let v of children) {
      if (node[v] && typeof node[v] === 'object') {
        recurse(node[v], node, v, hasNodeModules || v === 'node_modules', list.concat(x));
      }
    }

    if (x.hasNodeModules === false) {
      if (parent && key && key !== 'node_modules') {
        // log.warning('deleting ', key, 'from', parent);
        delete parent[key];
      }
    }

  })(treeObj, null, null, false, []);

};

searchDir(searchRoot, treeObj[key], err => {

  if (err) {
    throw err;
  }

  cleanTree(treeObj);

  const treeString = treeify.asTree(treeObj, true);
  const formattedStr = String(treeString).split('\n').map(function (line) {
    return '\t' + line;
  });

  console.log(chalk.white(formattedStr.join('\n')));
  process.exit(0);

});

