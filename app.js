require('dotenv').config();

var https = require('https');
const express = require('express');
const expressApp = express();
const moment = require('moment');
var fs = require('fs');
var bodyParser = require('body-parser');
var haileyBot = require("./library/haileybot/index.js");

// parse various different custom JSON types as JSON
expressApp.use(bodyParser.json({
  type: 'application/json'
}))

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

// Start the Express Server
expressApp.get('/notifyBot', (req, res) => {

  var data = req.body.data;

  for (var i = 0; i < data.length; i++) {
    var object = data[i];
    var bank = object.bank;
    var payer = object.payer;
    var creditAmount = object.creditAmount;
    var creditAccount = object.creditAccount;
    haileyBot.sendAdmin(`Payment : ${payer} paid you ${creditAmount} to ${bank} - ${creditAccount}`);
  }
  console.log("Notify Bot")

  res.end(JSON.stringify({
    code: "000"
  }))
})