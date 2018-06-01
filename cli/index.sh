#!/usr/bin/env bash


DIRN="$(dirname "$0")";
RL="$(readlink "$0")";
EXECDIR="$(dirname $(dirname "$RL"))";
MYPATH="$DIRN/$EXECDIR";
project_root="$(cd $(dirname ${MYPATH}) && pwd)/$(basename ${MYPATH})";
npm_root_bin="${project_root}/node_modules/.bin";
export PATH="${npm_root_bin}:${PATH}";
node "${project_root}/dist/index.js" $@;






