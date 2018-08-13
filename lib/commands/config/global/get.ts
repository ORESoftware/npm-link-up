'use strict';

import {NluGlobalSettingsConf} from "../../../index";
import * as stdio from 'json-stdio';

export default function (opts: any, confPath: string, conf: NluGlobalSettingsConf, key: string, value?: string) {
  
  let log = null;
  
  if (opts.json) {
    log = stdio.log.bind(stdio);
  }
  else {
    log = console.log.bind(console);
  }
  
  if (!key) {
    console.log('Global settings:');
    return log(conf);
  }
  
  if (key in conf) {
    console.log('Global settings:');
    return log({[key]: conf[key]});
  }
  
  console.log(`(NLU global config does not have key: "${key}")`);
  
}
