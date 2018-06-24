'use strict';

import chalk from 'chalk';
const dashdash = require('dashdash');
import options from "./cmd-line-opts";
import {NPMLinkUpOpts} from "../../npmlinkup";
import log from '../../logging';
import npmLinkUpPkg = require('../../../package.json');

let opts: NPMLinkUpOpts, parser = dashdash.createParser({options});

try {
  opts = parser.parse(process.argv);
} catch (e) {
  log.error(' => CLI parsing error:', e.message);
  process.exit(1);
}


if (opts.help) {
  let help = parser.help({includeEnv: true}).trimRight();
  console.log('usage: nlu [OPTIONS]\n' + 'options:\n' + help);
  process.exit(0);
}



log.error('No option was recognized, exiting with 1.');
process.exit(1);
