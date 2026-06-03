const path = require('path');

const searchRoot = path.resolve(
  process.env.R2G_SEARCH_ROOT ||
  process.env.MY_DOCKER_R2G_SEARCH_ROOT ||
  process.env.HOME ||
  ''
);

if (!path.isAbsolute(searchRoot)) {
  throw new Error('Please set R2G_SEARCH_ROOT or MY_DOCKER_R2G_SEARCH_ROOT to an absolute folder path.');
}

exports.default = {
  searchRoot,
  tests: '',
  packages: {}
};
