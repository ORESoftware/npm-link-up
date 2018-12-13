'use strict';

import chalk from 'chalk';

const debugging = process.argv.indexOf('--debug') > 2;

export const log = {
  info: console.log.bind(console, chalk.gray('nlu/info:')),
  good: console.log.bind(console, chalk.green('nlu/info:')),
  veryGood: console.log.bind(console, chalk.green.bold('nlu/info:')),
  warning: console.log.bind(console, chalk.yellow.bold('nlu/warn:')),
  warn: console.log.bind(console, chalk.yellow.bold('nlu/warn:')),
  error: console.log.bind(console, chalk.redBright('nlu/error:')),
  debug: function (...args: any[]) {
    debugging && console.error.apply(console, args);
  }
};

export default log;
