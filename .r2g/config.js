'use strict';

// note: only include dependencies in this file, which are in your project's package.json file
const path = require('path');

if (!path.isAbsolute(process.env.MY_DOCKER_R2G_SEARCH_ROOT || '')) {
  throw new Error('Please set the env var "MY_DOCKER_R2G_SEARCH_ROOT" to an absolute folder path.');
}

exports.default = {

  searchRoot: path.resolve(process.env.MY_DOCKER_R2G_SEARCH_ROOT),
  tests: '',
  packages: {}

};
