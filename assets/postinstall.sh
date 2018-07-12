#!/usr/bin/env bash

set -e;

if [ "$skip_npm_link_up_postinstall" == "yes" ]; then
    echo "skipping nlu postinstall routine.";
    exit 0;
fi

export FORCE_COLOR=1;
export skip_npm_link_up_postinstall="yes";

mkdir -p "$HOME/.oresoftware" || {
  echo "Could not create .oresoftware dir in user home.";
  exit 1;
}


mkdir -p "$HOME/.oresoftware/bash" && {
  cat "assets/shell.sh" > "$HOME/.oresoftware/bash/nlu.sh" || {
    echo "Could not copy nlu.sh file to ~/.oresoftware/bash dir.";
    exit 1;
  }
}

mkdir -p "$HOME/.oresoftware/bash" && {
  cat "assets/completion.sh" > "$HOME/.oresoftware/bash/nlu.completion.sh" || {
    echo "Could not copy completion.sh file to ~/.oresoftware/bash dir.";
    exit 1;
  }
}

(
    cat "node_modules/@oresoftware/shell/assets/shell.sh" > "$HOME/.oresoftware/shell.sh" && {
        echo "Successfully copied @oresoftware/shell/assets/shell.sh to $HOME/.oresoftware/shell.sh";
        exit 0;
    }

    curl -H 'Cache-Control: no-cache' \
    "https://raw.githubusercontent.com/oresoftware/shell/master/assets/shell.sh?$(date +%s)" \
    --output "$HOME/.oresoftware/shell.sh" 2> /dev/null || {
       echo "curl command failed to read shell.sh."
       exit 1;
    }
)


echo "";
echo -e "${ores_green}nlu was installed successfully.${ores_no_color}";
echo -e "Add the following line to your .bashrc/.bash_profile files:";
echo -e "${ores_cyan} . \"\$HOME/.oresoftware/shell.sh\"${ores_no_color}";
echo "";


