'use strict';

import * as fs from 'fs';
import log from "../../../logging";
import chalk from "chalk";

export default function (opts: any, confPath: string, conf: any) {

  conf.localSettings = {};

  const result = JSON.stringify(conf, null, 2);

  fs.writeFile(confPath, result, err => {

    if (err) {
      log.error('Could not write out global config.');
      log.error('Here is the config object:', conf);
      log.error(err);
      process.exit(1);
    }

    process.exit(0);

  });

}
