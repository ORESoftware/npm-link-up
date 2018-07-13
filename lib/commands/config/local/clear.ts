'use strict';

import {NluGlobalSettingsConf} from "./index";
import * as fs from 'fs';
import log from "../../logging";
import chalk from "chalk";
import {globalConfigFilePath} from "../../utils";

export default function (opts: any, conf: NluGlobalSettingsConf) {

  fs.writeFile(globalConfigFilePath, '{}', err => {

    if (err) {
      log.error('Could not write out global config.');
      log.error('Here is the config object:', conf);
      log.error(err);
      process.exit(1);
    }

    process.exit(0);

  });

}
