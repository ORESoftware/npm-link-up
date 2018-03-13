#!/usr/bin/env bash

set -e;

echo "npm-link-up postinstall routine has just started."

mkdir -p "$HOME/.npmlinkup/global"


(
    # run this stuff in a subshell
    cd "$HOME/.npmlinkup/global"

    echo "npm-link-up pwd: $(pwd)"

    if [[ ! -f package.json ]]; then
        npm init -f
    fi

    if [[ "$oresoftware_env" == "alex" ]]; then
        npm link npm-link-up -f
    else
        npm install -S npm-link-up@latest
    fi

)


echo "npm-link-up postinstall routine has completed successfully."

