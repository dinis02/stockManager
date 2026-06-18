FROM node:24-bookworm AS frontend-build

WORKDIR /app

COPY package*.json ./
# Use `npm ci` when a lockfile exists, otherwise fall back to `npm install`
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

COPY angular.json tsconfig*.json ./
COPY src ./src
RUN npm run build

FROM node:18-bullseye AS runtime

ENV NODE_ENV=production
ENV PORT=3000
ENV DATA_DIR=/data

WORKDIR /app

COPY server/package*.json ./server/
COPY server ./server
WORKDIR /app/server
RUN npm install --omit=dev

WORKDIR /app
COPY --from=frontend-build /app/dist ./dist

EXPOSE 3000

CMD ["node", "server/index.js"]
