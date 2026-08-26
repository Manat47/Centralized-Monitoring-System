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
EXPOSE 3001
CMD ["npm", "run", "start:prod"]