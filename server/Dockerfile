FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --production
COPY . .
RUN mkdir -p uploads
EXPOSE 8080
ENV PORT=8080
CMD ["node", "index.js"]
