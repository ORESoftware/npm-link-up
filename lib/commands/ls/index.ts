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

opts.config = path.resolve(String(opts.config || '').replace(/\.nlu\.json$/, ''));

try {
  if (opts.config) {
    assert(fs.statSync(opts.config).isDirectory(), 'config path is not a directory.');
  }
}
catch (err) {
  log.error('You declared a config path but the following path is not a directory:', opts.config);
  throw chalk.magenta(err.message);
}

const searchRoot = process.cwd();
log.info('Searching for symlinked packages in this directory:', searchRoot);

type Task = (cb: EVCb<any>) => void;
const queue = async.queue<Task, any>((task, cb) => task(cb), 6);

const treeObj = {};

const ignore = new Set(['.git', '.idea', '.r2g', 'dist']);

const searchDir = (dir: string, node: any, cb: EVCb<null>) => {

  queue.push(callback => {

    fs.readdir(dir, (err, items) => {

      callback(null);

      if (err) {
        log.warning(err.message);
        return cb(null);
      }

      const searchable = items.filter(v => !ignore.has(v));

      async.eachLimit(searchable, 5, (v, cb) => {

        const currentNode = node[v] = {};
        const itemPath = path.resolve(dir + '/' + v);
        const parentDir = path.basename(path.dirname(itemPath));
        const nodeModulesIsParent = parentDir === 'node_modules';

        fs.lstat(itemPath, (err, stats) => {

          if (err) {
            log.warning(err.message);
            delete node[v];
            return cb(null);
          }

          if (stats.isFile()) {
            delete node[v];
            return cb(null);
          }

          if (nodeModulesIsParent) {
            if (stats.isSymbolicLink()) {
              node[v] = v;
            }
            else{
              delete node[v];
            }
            return cb(null);
          }

          if (stats.isDirectory()) {
            return searchDir(itemPath, currentNode, cb);
          }

          delete node[v];
          cb(null);

        });

      }, cb);

    });

  });

};

const cleanTree = (treeObj: any) => {

  const newTree = {};

};

searchDir(searchRoot, treeObj, err => {

  if (err) {
    throw err;
  }

  // console.log('tree object:', treeObj);

  const treeString = treeify.asTree(treeObj, true);
  const formattedStr = String(treeString).split('\n').map(function (line) {
    return '\t' + line;
  });

  console.log(chalk.white(formattedStr.join('\n')));
  process.exit(0);

});

