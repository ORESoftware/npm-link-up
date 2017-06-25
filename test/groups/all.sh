#!/usr/bin/env bash


git clone https://github.com/ORESoftware/npm-link-up.git &&
cd npm-link-up &&
git checkout dev &&  # checkout the dev branch, not master branch
npm install &&

#SUMAN=$(which suman);
#
#if [[ -z ${SUMAN} ]]; then
#echo "installing suman globally"
#npm install -g suman
#fi

suman test/src/all.test.js