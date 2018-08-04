#!/usr/bin/env bash

get_latest_source_nlu(){
 . "$HOME/.oresoftware/bash/nlu.sh"
}

nlu(){

   local first_arg="$1";

   if [ "$first_arg" == "set" ]; then

      local second_arg="$2";
      local third_arg="$3";

     if [ -z "$second_arg" ]; then
        echo >&2 "'nlu set a b', requires that a be defined/non-empty."
        return 1
     fi

     second_arg="$(echo "$second_arg" | sed -r 's/[^[:alnum:]]/_/g')";

     if [ "$third_arg" == "false" ]; then
        third_arg="0";
     fi

     if [ -z "$third_arg" ]; then
        third_arg="";
        echo >&2 "warning: 'nlu set a b', b will be an empty variable, according to your most recent command."
     fi

      export "nlu_setting_$second_arg"="$third_arg";
      return 0;
   fi


    if [ "$first_arg" == "get" ]; then

      local second_arg="$2";

      if [ -z "$second_arg" ]; then
        echo >&2 "'\$ nlu get foo', requires that 'foo' be defined/non-empty."
        return 1
      fi

      second_arg="$(echo "$second_arg" | sed -r 's/[^[:alnum:]]/_/g')";

      local z="nlu_setting_$second_arg";
      echo "${!z}"  # "this is called "indirection", see: Evaluating indirect/reference variables"
      return 0;
   fi


   if ! type -f nlu &> /dev/null || ! which nlu &> /dev/null; then

        echo "Installing the npm-link-up package globally..."
        npm i -s -g "npm-link-up"  || {
          echo -e "Could not install 'npm-link-up' globally." >&2;
          echo -e "Please check your permissions to install NPM packages globally."  >&2;
          return 1;
      }
   fi

   command nlu "$@";
}


npmlinkup(){
   nlu "$@";
}


export -f nlu;
export -f npmlinkup;
export -f get_latest_source_nlu;
