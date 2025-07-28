FROM alpine:latest

RUN apk add --update --no-cache \
    alpine-sdk \
    curl \
    python3 \
    py3-pip \
    nodejs-lts \
    npm

# link up python3
RUN ln -sf python3 /usr/bin/python

# link up Node
RUN ln -sf node /usr/bin/nodejs
RUN npm install -g http-server

RUN adduser -D -h /home/app -s /bin/ash app
USER app
WORKDIR app

ENV PORT=8000
EXPOSE 8000
HEALTHCHECK --start-period=30s --interval=5m CMD curl -f http://127.0.0.1:8000 || exit 1
