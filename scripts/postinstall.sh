#!/usr/bin/env bash

set -e;

mkdir -p "$HOME/.npmlinkup/global"
cd "$HOME/.npmlinkup/global"

if [[ ! -f package.json ]]; then
    npm init -f
fi

npm install -S npm-link-up@latest
