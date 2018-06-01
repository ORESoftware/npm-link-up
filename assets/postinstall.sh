#!/usr/bin/env bash

set -e;

if [ "$skip_npm_link_up_postinstall" == "yes" ]; then
    echo "skipping nlu postinstall routine.";
    exit 0;
fi


export skip_npm_link_up_postinstall="yes";

mkdir -p "$HOME/.oresoftware" && {
  echo "Could not create .oresoftware dir in user home.";
  exit 1;
}


mkdir -p "$HOME/.oresoftware/bash" && {
  cat "assets/nlu.sh" > "$HOME/.oresoftware/bash/nlu.sh";
  echo "Could not copy nlu.sh file to .oresoftware/bash dir.";
  exit 1;
}

(

    cat "node_modules/@oresoftware/shell/assets/shell.sh" > "$HOME/.oresoftware/shell.sh" && {
        echo "Successfully copied @oresoftware/shell/assets/shell.sh to $HOME/.oresoftware/shell.sh";
        return 0;
    }

    curl -H 'Cache-Control: no-cache' \
    "https://raw.githubusercontent.com/oresoftware/shell/master/assets/shell.sh?$(date +%s)" \
    --output "$HOME/.oresoftware/shell.sh" 2> /dev/null || {
       echo "curl command failed to read shell.sh."
       return 1;
    }


)


echo "";
echo -e "${r2g_green}r2g was installed successfully.${r2g_no_color}";
echo -e "Add the following line to your .bashrc/.bash_profile files:";
echo -e "${r2g_cyan} . \"\$HOME/.oresoftware/shell.sh\"${r2g_no_color}";
echo "";


