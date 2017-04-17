'use strict';

//core
const path = require('path');
const util = require('util');
const assert = require('assert');
const fs = require('fs');

//npm
const sumanUtils = require('suman-utils');
const _ = require('underscore');

//////////////////////////////////////////////////////////////////////

//TODO: these functions should give users options to use kubernetes or docker

function run() {
  return 'docker run -it --tty=false --rm ' + this.name;
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////

const defaults = Object.freeze({
  allowReuseImage: false,
  useContainer: true,
  run: run
});

////////////////////////////////////////////////////////////////////////////////////////////////////////////////

module.exports = data => {

  data = data || {};
  assert(typeof data === 'object', ' => Please pass in object to suman.groups.js function.');

  console.log('data passed to groups fn => ', data);

  const testDir = process.env.TEST_DIR;
  const r = path.resolve(testDir + '/groups');
  const items = fs.readdirSync(r).filter(function (p) {
    return path.extname(path.resolve(r + '/' + p)) === '.sh';
  });

  const groups = items.map(function (item) {

    item = path.resolve(r + '/' + item);

    return {

      cwd: r,
      name: path.basename(item, path.extname(item)),   // remove .sh from end

      getPathToScript: function () {
        return item;
      },

      // dockerfilePath: path.resolve(r + '/' + item + '/Dockerfile'),

      dockerfilePath: path.resolve(r + '/Dockerfile'),

      build: function () {
        return 'cd ' + this.cwd + ' &&  docker build --file='
          + this.dockerfilePath + ' -t ' + this.name + ' . '
      }

    }
  });

  return {

    //TODO: have to handle the case where the build has already been built -
    // don't want to rebuild container
    // put in .suman/groups/scripts
    // if pathToScript is null/undefined,
    // will read script with the same name as the group in the above dir

    groups: groups.map(function (item) {
      const val = Object.assign({}, defaults, data, item);
      console.log('\n val => \n', util.inspect(val));
      return val;
    })
  }

};

