require('dotenv').config();

const util = require('util')

var https = require('https');
const express = require('express');
const expressApp = express();
var fs = require('fs');
var haileyBot = require("./library/haileybot/index.js");

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

// Initiailize Hailey Bot
var haileyBot = haileyBot(botOpts);

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

    haileyBot.sendAdmin('Incoming message : ' + body);

    console.log("End Notify bot")

    var json = JSON.parse(body);
    for (var i = 0; i < json.data.length; i++) {
      var object = json.data[i];
      var bank = object.bank;
      var payer = object.payer;
      var creditAmount = object.creditAmount;
      var creditAccount = object.creditAccount;
      haileyBot.sendAdmin(`Payment : ${payer} paid you ${creditAmount} to ${bank} - ${creditAccount}`);
    }

    if (json.data.length == 0) {
      haileyBot.sendAdmin('Incoming message but no parsable content');
    }

    res.end(JSON.stringify({
      code: "000"
    }))
  });

})