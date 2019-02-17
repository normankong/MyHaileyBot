require('dotenv').config();

var https = require('https');
const express = require('express');
const expressApp = express();
const moment = require('moment');
var fs = require('fs');
var haileyBot = require("./library/haileybot/index.js");

if (process.env.ENVIRONMENT == "PRD") {
  // Attach Express to existing server
  const BOT_PORT = process.env.BOT_PORT || 8080;
  expressApp.listen(BOT_PORT, () => {
    console.log(`Telebot listening on port ${process.env.BOT_PORT}`);
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
  console.log("Sending Hello World")
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

var haileyBot = haileyBot(botOpts);

// Start the Express Server
expressApp.get('/showStatus', (req, res) => {
  res.send('Show Status');
  haileyBot.sendAdmin("How do you do ?");
  console.log("Sending Show Status")
})