FROM node:22.19.0-alpine AS dependencies
WORKDIR /app
COPY package*.json ./
RUN npm ci


FROM dependencies AS build
COPY . .
RUN npm run build

FROM node:22.19.0-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY --from=build /app/migrations ./migrations
COPY --from=build /app/scripts ./scripts
EXPOSE 3007
CMD ["sh", "-c", "npm run db:migrate && npm run start:prod"]
