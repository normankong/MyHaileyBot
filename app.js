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

    let json = JSON.parse(body);
    if (json.code == "000") {
      for (let i = 0; i < json.data.length; i++) {
        let object = json.data[i];

        let message = "";
        if (object.type == "ICT")
        {
          let bank = object.bank;
          let payer = object.payer;
          let creditAmount = object.creditAmount;
          let creditAccount = object.creditAccount;
          message = `Payment : ${payer} paid you ${creditAmount} to ${bank} - ${creditAccount}`;
        }

        if (object.type == "STM")
        {
          let bank = object.bank;
          let acct = object.acct;
          message = `親 : 你有電子月結單，快來看看 : ${bank} ${acct}`;
        }
        
        
        haileyBot.sendAdmin(message);
      }
    }

    res.end(JSON.stringify({
      code: "000"
    }))
  });

})