"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var chalk = require("chalk");
var name = ' => [npm-link-up] => ';
exports.logInfo = console.log.bind(console, name);
exports.logGood = console.log.bind(console, chalk.cyan(name));
exports.logVeryGood = console.log.bind(console, chalk.green(name));
exports.logWarning = console.log.bind(console, chalk.yellow.bold(name));
exports.logError = console.log.bind(console, chalk.red(name));
