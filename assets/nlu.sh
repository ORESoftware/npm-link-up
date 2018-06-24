#!/usr/bin/env bash

get_latest_source_nlu(){
 . "$HOME/.oresoftware/bash/nlu.sh"
}

nlu(){

  if ! type -f nlu &> /dev/null || ! which nlu &> /dev/null; then

        echo "Installing the npm-link-up package globaly..."
        npm i -s -g "npm-link-up"  || {
          echo -e "Could not install 'npm-link-up' globally.";
          echo -e "Please check your permissions to install NPM packages globally.";
          return 1;
      }
  fi

  command nlu $@
}


npmlinkup(){

  if ! type -f npmlinkup &> /dev/null || ! which npmlinkup &> /dev/null; then

        echo "Installing the npm-link-up package globaly..."
        npm i -s -g "npm-link-up"  || {

          echo -e "Could not install 'npm-link-up' globally.";
          echo -e "Please check your permissions to install NPM packages globally.";
          return 1;
      }
  fi

  command npmlinkup $@
}


export -f nlu;
export -f npmlinkup;
export -f get_latest_source_nlu;
