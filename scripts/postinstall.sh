#!/usr/bin/env bash

set -e;

mkdir -p "$HOME/.npmlinkup/global"
cd "$HOME/.npmlinkup/global"

if [[ ! -f package.json ]]; then
    npm init -f
fi

if [[ "$oresoftware_env" === "alex" ]]; then
    npm link npm-link-up -f
else
    npm install -S npm-link-up
fi


