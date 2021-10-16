FROM node:11
WORKDIR /usr/src/app

RUN npm install nodemon
COPY package*.json ./
RUN npm install
CMD ["npm", "start"]
