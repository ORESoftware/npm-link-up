'use strict';

import chalk from 'chalk';

export const log = {
  info: console.log.bind(console, chalk.gray('[nlu/npm-link-up info]')),
  good: console.log.bind(console, chalk.cyan('[nlu/npm-link-up info]')),
  veryGood: console.log.bind(console, chalk.green('[nlu/npm-link-up info]')),
  warning: console.log.bind(console, chalk.yellow.bold('[nlu/npm-link-up warn]')),
  warn: console.log.bind(console, chalk.yellow.bold('[nlu/npm-link-up warn]')),
  error: console.log.bind(console, chalk.magenta('[nlu/npm-link-up error]'))
};

export default log;
