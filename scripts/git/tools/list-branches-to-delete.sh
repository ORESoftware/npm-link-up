#!/usr/bin/env bash


git fetch origin;

echo; echo "Current branch: $(git rev-parse --abbrev-ref HEAD)"

echo; echo "Branches that have been merged with origin/dev:";

git branch --merged "remotes/origin/dev" | tr -d ' *' | while read branch; do
     echo "$branch";
done

echo; echo "Branches that have been merged with HEAD:";

git branch --merged HEAD | tr -d ' *' | while read branch; do
     echo "$branch";
done

echo;
