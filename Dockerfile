FROM node:22-bookworm AS frontend-build

WORKDIR /app

COPY package*.json ./
# Use `npm ci` when a lockfile exists, otherwise fall back to `npm install`
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

COPY angular.json tsconfig*.json ./
COPY src ./src
RUN npm run build

FROM node:22-bookworm AS server-deps

WORKDIR /app/server

COPY server/package*.json ./
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi
COPY server ./

FROM node:22-bookworm AS runtime

ENV NODE_ENV=production
ENV PORT=3000
ENV DATA_DIR=/data

WORKDIR /app

COPY --from=server-deps /app/server ./server
COPY --from=frontend-build /app/dist ./dist

EXPOSE 3000

CMD ["node", "server/index.js"]
