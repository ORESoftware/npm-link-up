#!/usr/bin/env bash

set -e; # exit immediately if any command fails

current_branch="$(git rev-parse --abbrev-ref HEAD)"

if [ "$current_branch" == "master" ] || [ "$current_branch" == "dev" ]; then
    echo 'Aborting script because you are on master or dev branch, you need to be on a feature branch.';
    exit 1;
fi

time_millis=`node -e 'console.log(Date.now())'`;
git fetch origin

git add .
git add -A
git commit --allow-empty -am "merge_at:${time_millis}"


git merge -Xignore-space-change --no-ff "origin/dev" # use --no-ff to force a new commit
git push origin HEAD

