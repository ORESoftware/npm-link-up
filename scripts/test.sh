#!/usr/bin/env bash

SUMAN=$(which suman);

if [[ -z ${SUMAN} ]]; then
npm install -g suman
fi

# this will create a docker container and run the test in there
suman --groups all