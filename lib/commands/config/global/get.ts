'use strict';

import {NluGlobalSettingsConf} from "../../../index";

export default function (opts: any, confPath: string, conf: NluGlobalSettingsConf, key: string, value?: string) {

  if (!key) {
    return console.log(conf);
  }

  if (key in conf) {
    return console.log(conf[key]);
  }

  console.log(`(NLU global config does not have key: "${key}")`);

}
