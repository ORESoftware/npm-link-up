#!/usr/bin/env bash


DIRN="$(dirname "$0")";
RL="$(readlink "$0")";
EXECDIR="$(dirname $(dirname "$RL"))";
MYPATH="$DIRN/$EXECDIR";
project_root="$(cd $(dirname ${MYPATH}) && pwd)/$(basename ${MYPATH})";


npm_root="${project_root}/node_modules";
more_path="${npm_root}/.bin";
export PATH="${more_path}:${PATH}";

echo " => NPM version used by npmlinkup => $(npm -v)";

node "${project_root}/dist/index.js" $@;






