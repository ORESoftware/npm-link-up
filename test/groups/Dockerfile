
#http://stackoverflow.com/questions/27701930/add-user-to-docker-container

# start with this image as a base
FROM node:6

RUN npm cache clean

RUN echo $NODE_PATH

RUN apt-get update && \
      apt-get -y install sudo

RUN npm cache clean

RUN chmod -R 777 $(npm root -g)

RUN sudo echo "newuser ALL=(ALL) NOPASSWD: ALL" >> /etc/sudoers

#RUN useradd -ms /bin/bash newuser
RUN useradd -ms /bin/bash newuser && echo "newuser:newuser" | chpasswd && adduser newuser sudo

USER newuser
WORKDIR /home/newuser

RUN sudo chown -R $(whoami) $(npm config get prefix)/{lib/node_modules,bin,share}

COPY all.sh .

ENTRYPOINT ["/bin/bash", "/home/newuser/all.sh"]