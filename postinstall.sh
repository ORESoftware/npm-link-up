#!/usr/bin/env bash

set -e;

if [ "$skip_npm_link_up_postinstall" == "yes" ]; then
    echo "skipping nlu postinstall routine.";
    exit 0;
fi


export skip_npm_link_up_postinstall="yes";
mkdir -p "$HOME/.npmlinkup/global"
source_dir="$PWD";

(
    cd "$HOME/.npmlinkup/global"

    if [[ ! -f package.json ]]; then
        npm init -f
    fi

    npm install "$source_dir" -f

)


echo "npm-link-up postinstall routine has completed successfully."

