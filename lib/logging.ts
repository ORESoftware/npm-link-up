import * as chalk from 'chalk';
const name = ' => [npm-link-up] => ';
export const logInfo = console.log.bind(console, name);
export const logGood = console.log.bind(console, chalk.cyan(name));
export const logVeryGood = console.log.bind(console, chalk.green(name));
export const logWarning = console.log.bind(console, chalk.yellow.bold(name));
export const logError = console.log.bind(console, chalk.red(name));