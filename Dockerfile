FROM node:22-alpine AS build

WORKDIR /app
COPY package*.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY packages/server/package.json packages/server/package.json
RUN npm ci

COPY packages/shared packages/shared
COPY packages/server packages/server
RUN npm run build:server

FROM node:22-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/package*.json ./
COPY --from=build /app/packages/shared/package.json packages/shared/package.json
COPY --from=build /app/packages/shared/dist packages/shared/dist
COPY --from=build /app/packages/server/package.json packages/server/package.json
COPY --from=build /app/packages/server/dist packages/server/dist
RUN npm ci --omit=dev

EXPOSE 3000
CMD ["npm", "run", "start:server"]
