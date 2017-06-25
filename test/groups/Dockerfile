
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

RUN npm config --global set color false
RUN npm config --global set progress=false
RUN npm config --global set loglevel=warn

RUN npm set color false
RUN npm set progress=false
RUN npm set loglevel=warn


RUN echo "installing suman globally...7"
RUN npm install -g suman@latest

RUN echo "done installing suman globally1"
RUN echo "done installing suman globally5"

RUN git clone https://github.com/ORESoftware/npm-link-up.git
WORKDIR /home/newuser/npm-link-up
RUN npm install  --no-optional --log-level=warn --silent > /dev/null 2>&1

COPY all.sh .

ENTRYPOINT ["/bin/bash", "/home/newuser/npm-link-up/all.sh"]