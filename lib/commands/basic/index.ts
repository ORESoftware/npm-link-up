'use strict';

import chalk from 'chalk';
const dashdash = require('dashdash');
import options from "./cmd-line-opts";
import log from '../../logging';
const npmLinkUpPkg = require('../../../package.json');
import residence = require('residence');
const cwd = process.cwd();
const root = residence.findProjectRoot(cwd);
import addOpts from '../add/cmd-line-opts';
import initOpts from '../init/cmd-line-opts';
import runOpts from '../run/cmd-line-opts';

process.once('exit', code => {
  log.info('Exiting with code:', code, '\n');
});

if (!root) {
  log.error('Cannot find a project root given your current working directory:', chalk.magenta(cwd));
  log.error(' => NLU could not find a package.json file within your cwd.');
  process.exit(1);
}

const commands = [
  'nlu run',
  'nlu init',
  'nlu add'
];

const allowUnknown = process.argv.indexOf('--allow-unknown') > 0;
let opts: any, parser = dashdash.createParser({options, allowUnknown});

try {
  opts = parser.parse(process.argv);
} catch (e) {
  log.error(chalk.magenta(' => CLI parsing error:'), chalk.magentaBright.bold(e.message));
  log.warn(chalk.gray('Perhaps you meant to use on of these commands instead:', chalk.gray.bold(commands.join(', '))));
  process.exit(1);
}

if (opts.version) {
  console.log(npmLinkUpPkg.version);
  process.exit(0);
}

if (opts.help) {
  let help = parser.help({includeEnv: true}).trimRight();
  console.log('usage: nlu [OPTIONS]\n' + 'options:\n' + help);
  console.log();
  log.info('To get help for "nlu init", use:', chalk.blueBright.bold('nlu init --help'));
  log.info('To get help for "nlu run", use:', chalk.blueBright.bold('nlu run --help'));
  log.info('To get help for "nlu run", use:', chalk.blueBright.bold('nlu add --help'));
  log.info('Etc.');
  process.exit(0);
}

const flattenDeep = function (arr1: Array<any>): Array<any> {
  return arr1.reduce((acc, val) => Array.isArray(val) ? acc.concat(flattenDeep(val)) : acc.concat(val), []);
};

if (opts.bash_completion) {

  const allOpts = flattenDeep([addOpts, initOpts, runOpts, options]);

  let generatedBashCode = dashdash.bashCompletionFromOptions({
    name: 'nlu',
    options: allOpts,
    includeHidden: false
  });

  console.log(generatedBashCode);
  process.exit(0);
}


log.warn(chalk.bold.italic('No command line option was recognized.'));
log.warn(chalk.gray('Perhaps you meant to use one of these commands instead:', chalk.gray.bold(commands.join(', '))));
process.exit(1);
