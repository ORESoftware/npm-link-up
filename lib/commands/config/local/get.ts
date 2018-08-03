'use strict';

import {NluGlobalSettingsConf} from "../../../index";

export default function (opts: any, confPath: string, conf: NluGlobalSettingsConf, key: string, value?: string) {

  let localSettings : any = conf.localSettings || {};

  if(!(localSettings && typeof localSettings === 'object')){
    localSettings = {}
  }

  if(Array.isArray(localSettings)){
    localSettings = {};
  }

  if (!key) {
    return console.log(localSettings);
  }

  if (key in localSettings) {
    return console.log(localSettings[key]);
  }

  console.log(`(NLU local config does not have key: "${key}")`);

}
