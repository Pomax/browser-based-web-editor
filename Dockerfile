FROM local-base-image:latest
RUN sh -c source .container/.env || true
RUN sh .container/build.sh || true
CMD sh .container/run.sh
