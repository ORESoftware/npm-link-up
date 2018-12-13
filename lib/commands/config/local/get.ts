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
  
  let localSettings: any = conf.localSettings || {};
  
  if (!(localSettings && typeof localSettings === 'object')) {
    localSettings = {}
  }
  
  if (Array.isArray(localSettings)) {
    localSettings = {};
  }
  
  if (!key) {
    console.log('Local settings:');
    return log(localSettings);
  }
  
  if (key in localSettings) {
    console.log('Local settings:');
    return log({[key]: localSettings[key]});
  }
  
  console.log(`(NLU local config does not have key: "${key}")`);
  
}
