# syntax=docker/dockerfile:1

# Every image in the stack is a target of this file. The install and the
# monorepo build happen once, in stages the targets share.

FROM node:22-alpine AS manifests
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/scoring/package.json packages/scoring/package.json
COPY packages/brackets/package.json packages/brackets/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/persistence/package.json packages/persistence/package.json
COPY packages/live-messaging/package.json packages/live-messaging/package.json
COPY packages/startgg/package.json packages/startgg/package.json
COPY apps/migrations/package.json apps/migrations/package.json
COPY apps/api/package.json apps/api/package.json
COPY apps/realtime/package.json apps/realtime/package.json
COPY apps/frontend/package.json apps/frontend/package.json
COPY tools/dataset-seeder/package.json tools/dataset-seeder/package.json

FROM manifests AS build-dependencies
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund

FROM manifests AS runtime-dependencies
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev --no-audit --no-fund

# Node sizes its heap from the VM's memory, which on a 2 GB Docker VM is not
# enough to compile this repository. The setting bounds one build process and
# is not carried into any runtime image.
FROM build-dependencies AS build
ENV NODE_OPTIONS=--max-old-space-size=1408
COPY . .
RUN npm run build

FROM node:22-alpine AS node-runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=runtime-dependencies /app ./
COPY --from=build /app/packages/scoring/dist packages/scoring/dist
COPY --from=build /app/packages/brackets/dist packages/brackets/dist
COPY --from=build /app/packages/contracts/dist packages/contracts/dist
COPY --from=build /app/packages/persistence/dist packages/persistence/dist
COPY --from=build /app/packages/live-messaging/dist packages/live-messaging/dist
COPY --from=build /app/packages/startgg/dist packages/startgg/dist

FROM node-runtime AS migrations
COPY --from=build /app/apps/migrations/dist apps/migrations/dist
CMD ["npm", "run", "migration:run:prod", "--workspace=@tournament-hub/migrations"]

FROM node-runtime AS api
COPY --from=build /app/apps/api/dist apps/api/dist
EXPOSE 3000
CMD ["npm", "run", "start:prod", "--workspace=@tournament-hub/api"]

FROM node-runtime AS realtime
COPY --from=build /app/apps/realtime/dist apps/realtime/dist
EXPOSE 3003
CMD ["npm", "run", "start:prod", "--workspace=@tournament-hub/realtime"]

# Not part of the running stack. It exists as an image so a measured run can
# write its dataset from inside the Compose network.
FROM node-runtime AS dataset-seeder
COPY --from=build /app/tools/dataset-seeder/dist tools/dataset-seeder/dist
CMD ["npm", "run", "start", "--workspace=@tournament-hub/dataset-seeder"]

FROM nginx:alpine AS frontend
COPY --from=build /app/apps/frontend/dist /usr/share/nginx/html
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY apps/frontend/runtime-config.template.js /etc/tournament-hub/runtime-config.template.js
COPY apps/frontend/40-runtime-config.sh /docker-entrypoint.d/40-runtime-config.sh
RUN chmod +x /docker-entrypoint.d/40-runtime-config.sh
ENV PUBLIC_API_URL=/api/ \
    PUBLIC_REALTIME_URL=/realtime/
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
