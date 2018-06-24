'use strict';

import chalk from 'chalk';
const name = '[nlu/npm-link-up]';

export const log = {
  info: console.log.bind(console, name),
  good: console.log.bind(console, chalk.cyan(name)),
  veryGood: console.log.bind(console, chalk.green(name)),
  warning: console.log.bind(console, chalk.yellow.bold(name)),
  warn: console.log.bind(console, chalk.yellow.bold(name)),
  error: console.log.bind(console, chalk.magenta(name))
};


export default log;
