FROM node:24-bookworm AS frontend-build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY angular.json tsconfig*.json ./
COPY src ./src
RUN npm run build

FROM node:24-bookworm AS runtime

ENV NODE_ENV=production
ENV PORT=3000
ENV DATA_DIR=/data

WORKDIR /app

COPY server/package*.json ./server/
RUN npm ci --omit=dev --prefix ./server

COPY server ./server
COPY --from=frontend-build /app/dist ./dist

EXPOSE 3000

CMD ["node", "server/index.js"]
