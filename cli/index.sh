#!/usr/bin/env bash


my_args=( "$@" );

first_arg="$1"

nlu_match_arg(){
    # checks to see if the first arg, is among the remaining args
    # for example  ql_match_arg --json --json # yes
    first_item="$1"; shift;
    for var in "$@"; do
        if [[ "$var" == "$first_item" ]]; then
          return 0;
        fi
    done
    return 1;
}

use_shell_version="nope";

if nlu_match_arg "--npm-shell-version" "${my_args[@]}"; then
  use_shell_version="yes"
fi

if nlu_match_arg "--shell-version" "${my_args[@]}"; then
  use_shell_version="yes"
fi



dir_name="$(dirname "$0")";
read_link="$(readlink "$0")";
exec_dir="$(dirname $(dirname "$read_link"))";
my_path="$dir_name/$exec_dir";
project_root="$(cd $(dirname ${my_path}) && pwd)/$(basename ${my_path})";
npm_root_bin="${project_root}/node_modules/.bin";


if [ "$use_shell_version" != "yes" ]; then
    echo " => NLU is addding local 'node_modules/.bin' executables to the PATH.";
    export PATH="${npm_root_bin}:${PATH}";
fi


echo " => NLU is using NPM version => $(npm --version)";


if [ "$first_arg" == "init" ]; then

    shift 1;
    node "${project_root}/dist/init.js" "$@";

elif [ "$first_arg" == "run" ]; then

    shift 1;
    node "${project_root}/dist/index.js" "$@";

else

    node "${project_root}/dist/index.js" "$@";

fi







