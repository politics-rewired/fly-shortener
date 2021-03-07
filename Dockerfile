### Dependency Cacher
### -------------------------
FROM endeveit/docker-jq:latest as deps

# To prevent cache invalidation from changes in fields other than dependencies
# https://stackoverflow.com/a/59606373
COPY package.json /tmp
RUN jq '{ dependencies, devDependencies, resolutions }' < /tmp/package.json > /tmp/deps.json

### Fat Build
### -------------------------
FROM node:14.16.0 as builder

WORKDIR /usr/link-shortener

# Cache dependencies
COPY --from=deps /tmp/deps.json ./package.json
COPY yarn.lock ./
RUN yarn install

# Copy and build application codebase
COPY . .
RUN yarn build

### Slim Deploy
### -------------------------
FROM node:14.16.0

WORKDIR /usr/link-shortener

# Install and cache production dependencies
COPY --from=deps /tmp/deps.json ./package.json
COPY yarn.lock ./
RUN yarn install --production

# Copy only the built source
COPY --from=builder /usr/link-shortener/dist ./dist

COPY package.json ./

EXPOSE 8080
CMD ["node", "./dist/server.js"]
