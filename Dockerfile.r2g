
#ARG base_image
#FROM $base_image

FROM node:10

ENV ores_bash_utils "https://raw.githubusercontent.com/oresoftware/npm.bash.utils"
ENV r2g_tarballs_base_url="https://raw.githubusercontent.com/oresoftware/tarballs"
ENV FORCE_COLOR=1
ENV docker_r2g_in_container=yes


RUN  curl -sS -o- "$ores_bash_utils/master/assets/install-basics.sh" | bash
RUN sudo echo "node ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

USER node
ENV USER="node"
ENV HOME="/home/node"
RUN mkdir -p /home/node/.docker_r2g_cache
RUN mkdir -p /home/node/app/node_modules
WORKDIR /home/node/app
ENV MY_R2G_DOCKER_SEARCH_ROOT="/home/node/.docker_r2g_cache"

#ENV USER="root"
#ENV HOME="/root"
#RUN mkdir -p  $HOME/.docker_r2g_cache
#RUN mkdir -p $HOME/app/node_modules
#WORKDIR /app

RUN npm config set unsafe-perm true

RUN sudo chmod -R 777  /home/node
#RUN sudo chmod -R 777  /app

RUN  curl -sS -o- "$ores_bash_utils/master/assets/run-non-root-chown.sh" | bash
RUN  curl -sS -o- "$ores_bash_utils/master/assets/run-npm-config-settings.sh" | bash

ARG CACHEBUST=1

#RUN npm i -g "@oresoftware/read.json"
#RUN npm i -g "@oresoftware/docker.r2g"
#RUN npm i -g "@oresoftware/r2g"

RUN npm i -g "$r2g_tarballs_base_url/master/tgz/oresoftware/read.json.tgz?$(date +%s)"
RUN npm i -g "$r2g_tarballs_base_url/master/tgz/oresoftware/r2g.tgz?$(date +%s)"
RUN npm i -g "$r2g_tarballs_base_url/master/tgz/oresoftware/r2g.docker.tgz?$(date +%s)"

COPY . .

RUN sudo chmod -R 777  /home/node
#RUN sudo chmod -R 777  /app/node_modules

ENTRYPOINT dkr2g run --allow-unknown $dkr2g_run_args



