#!/usr/bin/env bash


my_args=( "$@" );

nlu_match_arg(){
    # checks to see if the first arg, is among the remaining args
    # for example  ql_match_arg --json --json # yes
    first_item="$1"; shift;
    for var in "$@"; do
        if [[ "$var" == "$first_item" ]]; then
          echo "yes";
          return 0;
        fi
    done
    return 1;
}

use_shell_version=$(nlu_match_arg "--npm-shell-version" "${my_args[@]}");


DIRN="$(dirname "$0")";
RL="$(readlink "$0")";
EXECDIR="$(dirname $(dirname "$RL"))";
MYPATH="$DIRN/$EXECDIR";
project_root="$(cd $(dirname ${MYPATH}) && pwd)/$(basename ${MYPATH})";
npm_root_bin="${project_root}/node_modules/.bin";


if [ "$use_shell_version" != "yes" ]; then
    echo " => NLU is addding local 'node_modules/.bin' executables to the PATH.";
    export PATH="${npm_root_bin}:${PATH}";
fi


echo " => NLU is using NPM version => $(npm --version)";

node "${project_root}/dist/index.js" $@;






