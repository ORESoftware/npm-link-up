

import {logInfo, logError, logWarning, logVeryGood, logGood} from './logging';

/////////////////////////////////////////////////////////////////////////////////

export const getIgnore = function(conf, alwaysIgnoreThese){

  const ignore = (conf.ignore || []).concat(alwaysIgnoreThese)
    .filter(function (item: string, index: number, arr: Array<string>) {
      return arr.indexOf(item) === index;
    }).map(function (item: string) {
    return new RegExp(item);
  });


  if (ignore.length > 0) {
    console.log('\n => NPM Link Up will ignore paths that match any of the following => ');
    ignore.forEach(function (item: RegExp) {
      logWarning(`ignored => ${item}`);
    });
  }

  return ignore;

};