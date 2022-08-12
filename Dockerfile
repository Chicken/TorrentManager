FROM node:16-alpine

WORKDIR /app

ENV NODE_ENV="production"

RUN apk update && \
    apk upgrade && \
    apk add dumb-init

RUN chown -R node:node /app

COPY --chown=node:node yarn.lock package.json ./

RUN yarn --production=true --frozen-lockfile --link-duplicates

COPY --chown=node:node src/ src/

USER node:node

ENTRYPOINT [ "/usr/bin/dumb-init", "--" ]
CMD [ "yarn", "start" ]
