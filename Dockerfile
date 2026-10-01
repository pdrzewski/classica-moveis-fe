FROM node:20-alpine

WORKDIR /app

COPY classica-front-end/package.json classica-front-end/package-lock.json* ./
RUN npm install

COPY classica-front-end/ .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host"]