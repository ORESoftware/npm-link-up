
#http://stackoverflow.com/questions/27701930/add-user-to-docker-container

# start with this image as a base
FROM node:6

RUN npm cache clean

RUN echo $NODE_PATH

RUN apt-get update && \
      apt-get -y install sudo

RUN npm cache clean

RUN chmod -R 777 $(npm root -g)

RUN sudo apt-get -y upgrade
RUN sudo apt-get install -y sqlite3 libsqlite3-dev

RUN sudo echo "newuser ALL=(ALL) NOPASSWD: ALL" >> /etc/sudoers

#RUN useradd -ms /bin/bash newuser
RUN useradd -ms /bin/bash newuser && echo "newuser:newuser" | chpasswd && adduser newuser sudo

USER newuser
WORKDIR /home/newuser

RUN sudo chown -R $(whoami) $(npm config get prefix) || echo "no lib 1"
RUN sudo chown -R $(whoami) $(npm root -g) || echo "no lib 2"

RUN echo "installing suman globally..."
RUN npm install -g "github:sumanjs/suman#rebase_branch"

RUN echo "down installing suman globally"

COPY all.sh .

ENTRYPOINT ["/bin/bash", "/home/newuser/all.sh"]