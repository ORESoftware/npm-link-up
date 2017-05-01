#!/usr/bin/env bash


git clone https://github.com/ORESoftware/npm-link-up.git &&
cd npm-link-up &&
git checkout dev &&  # checkout the dev branch, not master branch
npm install &&
sudo chown -R $(whoami) $(npm config get prefix)/{lib/node_modules,bin,share}
node test/src/all.test.js