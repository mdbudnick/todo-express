FROM node:20-alpine
WORKDIR /usr/todo-express
COPY package*.json ./
RUN npm ci
COPY . .
EXPOSE 3001

CMD ["npm", "start"]