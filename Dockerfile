ARG NODE_VERSION=18
ARG NODE_ENV=production

FROM node:${NODE_VERSION}-alpine AS dependencies

WORKDIR /app
COPY package*.json ./

# Disable Husky prepare script
RUN npm pkg delete scripts.prepare || true
# Cài dependencies production
RUN npm ci --only=production \
  && npm install pdfkit --production \
  && npm cache clean --force
  
RUN npm ci --only=production && npm cache clean --force

FROM node:${NODE_VERSION}-alpine AS builder
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

FROM node:${NODE_VERSION}-alpine AS production
ENV NODE_ENV=${NODE_ENV}

RUN apk add --no-cache dumb-init && apk upgrade --no-cache

RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001 -G nodejs

WORKDIR /app

COPY --from=dependencies --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --chown=nodejs:nodejs . .

USER root
RUN apk add --no-cache mongodb-tools
RUN mkdir -p /app/backups /app/uploads/imports /app/logs \
  && chmod -R 777 /app/uploads /app/logs

USER nodejs

EXPOSE 3005

HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3005', (r) => {process.exit(r.statusCode < 500 ? 0 : 1)})" || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
