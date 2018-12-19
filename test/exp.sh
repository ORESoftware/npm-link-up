#!/usr/bin/env bash


versions=`cat <<EOF
   echo "nodejs version: $(node --version)"
   echo "r2g version: $(r2g --version)"
   echo "npm version: $(npm --version)"
EOF`

echo "$versions" | bash
