require('dotenv').config();

const util = require('util')
const axios = require('axios');

var https = require('https');
const express = require('express');
const expressApp = express();
var fs = require('fs');
const os = require('os');
var haileyBot = require("./library/haileybot/index.js");

// Initialize Environment variable
initialize()

if (process.env.ENVIRONMENT == "PRD") {
  // Attach Express to existing server
  const PORT = process.env.PORT || 8080;
  expressApp.listen(PORT, () => {
    console.log(`Telebot listening on port ${process.env.PORT}`);
    console.log('Press Ctrl+C to quit.');
  });
} else {
  // Start Local Server
  var tlsOptions = {
    key: fs.readFileSync(process.env.BOT_PRIVATE_KEY),
    cert: fs.readFileSync(process.env.BOT_CERT)
  }
  https.createServer(tlsOptions, expressApp)
    .listen(parseInt(process.env.BOT_PORT), function () {
      console.log('Telebot listening @ ' + process.env.BOT_PORT)
    })
}


// Start the Express Server
expressApp.get('/', (req, res) => {
  res.send('Hello World!')
  console.log("Sending Hello World");
})

// Enable Healthchcek
expressApp.get('/liveness_check', (req, res) => {
  res.send('Hello World!')
})

// Readiness Check
expressApp.get('/readiness_check', (req, res) => {
  res.send('Hello World!')
})

// Prepare Telegram Bot Options
var botOpts = {
  token: process.env.BOT_TOKEN,
  webhookRefresh: (process.env.BOT_ACTIVATE_WEBHOOK === "true"),
  webhookURL: process.env.BOT_WEBHOOK_URL + process.env.BOT_TOKEN,
  webhookCRT: process.env.BOT_CERT,
  localEndpoint: process.env.BOT_LOCAL_END_POINT + process.env.BOT_TOKEN,
  adminUser: process.env.ADMIN_USER,
  middleware: expressApp
}

// Initiailize Hailey Bot
haileyBot = haileyBot(botOpts);

// Register Show Status End point
expressApp.get('/showStatus', (req, res) => {
  console.log("Sending Show Status")

  haileyBot.sendAdmin("How do you do ?");

  res.send('Show Status');
})

// Register the Notify End point. Please note the Body Parser was not work as telegraf crash with it
expressApp.post('/notifyBot', (req, res) => {

  console.log("Notify Bot");

  let body = '';
  req.on('data', chunk => {
    body += chunk.toString(); // convert Buffer to string
  });
  req.on('end', () => {

    console.log("Body " + body);

    let json = JSON.parse(body);

    if (json.code == "000") {
      notifyBotWithMessage(json);
    }

    if (json.code == "001") {
      notifyBotWithImage(json);
    }
    res.end(JSON.stringify({
      code: "000"
    }))
  });

})

// Scheduler Task
expressApp.get('/scheduler', (req, res) => {
  haileyBot.handleScheduler(req.query);
  res.end(`ok`);
});

function notifyBotWithMessage(json) {

  // Standalone Message
  if (json.message != null) {
    haileyBot.sendAdmin(json.message);
  }
}

function notifyBotWithImage(json) {
  let source = json.source;
  console.log(`Download image from ${source}`);
  axios.get(source, {
      responseType: 'arraybuffer'
    })
    .then(response => {
      let buffer = new Buffer(response.data, 'binary')
      haileyBot.sendImage(buffer);
    })
    .catch(error => {
      console.log(error);
    });
}

function initialize() {
  if (process.env.LOCAL_NAME == os.userInfo().username) {
    console.log('Dev Environment')
    process.env.ENVIRONMENT = process.env.DEV_ENVIRONMENT;
    process.env.BOT_TOKEN = process.env.DEV_BOT_TOKEN;
    process.env.BOT_CERT = process.env.DEV_BOT_CERT;
    process.env.BOT_PUBLIC_KEY = process.env.DEV_BOT_PUBLIC_KEY;
    process.env.BOT_PRIVATE_KEY = process.env.DEV_BOT_PRIVATE_KEY;
    process.env.BOT_WEBHOOK_URL = process.env.DEV_BOT_WEBHOOK_URL;
    process.env.BOT_PORT = process.env.DEV_BOT_PORT;
    process.env.BOT_ACTIVATE_WEBHOOK = process.env.DEV_BOT_ACTIVATE_WEBHOOK;

  } else {
    console.log('Prd Environment')
    process.env.ENVIRONMENT = process.env.PRD_ENVIRONMENT;
    process.env.BOT_TOKEN = process.env.PRD_BOT_TOKEN;
    process.env.BOT_CERT = process.env.PRD_BOT_CERT;
    process.env.BOT_PUBLIC_KEY = process.env.PRD_BOT_PUBLIC_KEY;
    process.env.BOT_PRIVATE_KEY = process.env.PRD_BOT_PRIVATE_KEY;
    process.env.BOT_WEBHOOK_URL = process.env.PRD_BOT_WEBHOOK_URL;
    process.env.BOT_PORT = process.env.PRD_BOT_PORT;
    process.env.BOT_ACTIVATE_WEBHOOK = process.env.PRD_BOT_ACTIVATE_WEBHOOK;
  }
}