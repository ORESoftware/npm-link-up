'use strict';

import {NluGlobalSettingsConf} from "../../../index";
import * as fs from 'fs';
import log from "../../../logging";
import chalk from "chalk";
import {NluConf} from "../../../index";

export default function (opts: any, confPath: string, conf: NluConf, key: string, value?: string) {
  
  if (!key) {
    log.error(chalk.magenta(' => No key passed; we need a key to do a set operation.'));
    process.exit(1);
  }
  
  value = value || '';
  
  conf.localSettings = conf.localSettings || {};
  
  if (!(conf.localSettings && typeof conf.localSettings === 'object')) {
    conf.localSettings = {}
  }
  
  if (Array.isArray(conf.localSettings)) {
    conf.localSettings = {};
  }
  
  conf.localSettings[key] = value;
  
  const result = JSON.stringify(conf, null, 2);
  
  fs.writeFile(confPath, result, err => {
    
    if (err) {
      log.error('Could not write out global config.');
      log.error('Here is the config object:', conf);
      log.error(err);
      process.exit(1);
    }
    
    fs.readFile(confPath, (err, data) => {
      
      if (err) {
        log.error(err);
        process.exit(1);
      }
      
      try {
        let v = JSON.parse(String(data));
        let field = 'localSettings';
        console.log({[field]: v[field]});
      }
      catch (err) {
        log.error(err);
        process.exit(1);
      }
      
      process.exit(0);
    });
    
  });
  
}
