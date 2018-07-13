#!/usr/bin/env bash


echo;
my_args=( "$@" );
first_arg="$1"

export nlu_name="[nlu/npm-link-up]"

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

use_local="yes";

if nlu_match_arg "--no-use-local" "${my_args[@]}"; then
  use_local="nope"
fi


if nlu_match_arg "--no-local" "${my_args[@]}"; then
  use_local="nope"
fi


#dir_name="$(dirname "$0")";
#read_link="$(readlink "$0")";
#exec_dir="$(dirname $(dirname "$read_link"))";
#my_path="$dir_name/$exec_dir";
#project_root="$(cd $(dirname ${my_path}) && pwd)/$(basename ${my_path})";

#rp=`realpath $0`;
#echo "rp => $rp";

project_root="";

if [[ "$(uname -s)" == "Darwin" ]]; then
    project_root="$(dirname $(dirname $("$HOME/.oresoftware/bin/realpath" $0)))";

else
    project_root="$(dirname $(dirname $(realpath $0)))";
fi

npm_local_bin="${project_root}/node_modules/.bin";


if [ "$use_local" == "yes" ]; then
    echo "$nlu_name NLU is addding local 'node_modules/.bin' executables to the PATH.";
    echo "To not add local command line tools to the PATH, use the --no-local option.";
    export PATH="${npm_local_bin}:${PATH}";
fi


echo "$nlu_name NLU is using NPM version => $(npm --version)";


if [ "$first_arg" == "init" ]; then

    shift 1; node "${project_root}/dist/commands/init" "$@";

elif [ "$first_arg" == "install" ] || [ "$first_arg" == "i" ] ; then


  npm i -s "$@" || {
    echo "npm install command failed.";
    exit 1;
  }

  nlu run --install-main


elif [ "$first_arg" == "add" ]; then

    shift 1; node "${project_root}/dist/commands/add" "$@";

elif [ "$first_arg" == "run" ]; then

    shift 1; node "${project_root}/dist/commands/run" "$@";

elif [ "$first_arg" == "update" ]; then

    shift 1;
    echo "$nlu_name 'nlu update' is not implemented.";
    echo "$nlu_name You should manually update your .nlu.json files.";
    exit 1;

else

    node "${project_root}/dist/commands/basic" "$@";

fi







