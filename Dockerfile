FROM gcr.io/google-appengine/nodejs

WORKDIR /src

COPY package.json /src/
RUN npm install
COPY . /src/

EXPOSE 8443

CMD ["npm", "start"]