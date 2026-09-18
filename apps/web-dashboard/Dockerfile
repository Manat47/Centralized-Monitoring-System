FROM node:22.19.0-alpine AS dependencies

WORKDIR /app

COPY package*.json ./

RUN npm ci


FROM node:22.19.0-alpine AS build

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_API_GATEWAY_URL=/api
ARG API_GATEWAY_INTERNAL_URL=http://localhost:3005

ENV NEXT_PUBLIC_API_GATEWAY_URL=${NEXT_PUBLIC_API_GATEWAY_URL}
ENV API_GATEWAY_INTERNAL_URL=${API_GATEWAY_INTERNAL_URL}

RUN npm run build

FROM node:22.19.0-alpine AS production

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3010

COPY --from=build --chown=node:node /app/public ./public
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static

USER node

EXPOSE 3010

CMD ["node", "server.js"]