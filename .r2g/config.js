'use strict';

// note: only include dependencies in this file, which are in your project's package.json file
const path = require('path');

const envLookup = 'R2G_SEARCH_ROOT';
const searchRootPath = path.resolve(process.env[envLookup] || '');
console.log('r2g search root path:',searchRootPath);

if (!path.isAbsolute(searchRootPath)) {
  throw new Error(`Please set the env var "${envLookup}" to an absolute folder path.`);
}

exports.default = {

  searchRoot: searchRootPath,
  tests: '',
  packages: {
    "@oresoftware/shell": true,
    "prepend-transform": true,
    "residence": true,
    "json-stdio": true
  }

};
