#!/usr/bin/env bash



nlu(){

  local which_nlu="$(command -v nlu)"

  if [ -z "$which_nlu" ]; then
        npm install -g --loglevel=warn "npm-link-up"  || {
          return 1;
      }
  fi

  command nlu "$@"
}


npmlinkup(){

  local which_nlu="$(command -v npmlinkup)"

  if [ -z "$which_nlu" ]; then
        npm install -g --loglevel=warn "npm-link-up"  || {
          return 1;
      }
  fi

  command npmlinkup "$@"
}


export -f nlu;
export -f npmlinkup;
