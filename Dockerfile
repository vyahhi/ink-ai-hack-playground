FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG INK_RECOGNITION_API_URL
ARG INK_OPENROUTER_API_KEY
ARG INK_UPLOAD_API_URL
ENV INK_RECOGNITION_API_URL=$INK_RECOGNITION_API_URL
ENV INK_OPENROUTER_API_KEY=$INK_OPENROUTER_API_KEY
ENV INK_UPLOAD_API_URL=$INK_UPLOAD_API_URL
RUN npm run build

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
