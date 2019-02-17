'use strict';

const Telegraf = require('telegraf');
var financialHelper = require('./financial_helper.js');
var paymentHelper = require('./payment_helper.js');
var visionHelper = require('./vision_helper.js');

function createApplication(opts) {
  var opts = opts;

  var app = {};
  var bot = null;

  app.getOpts = function () {
    return opts;
  }

  app.init = function () {

    var token = opts.token;
    var webhookRefresh = opts.webhookRefresh;
    var webhookURL = opts.webhookURL;
    var webhookCRT = opts.webhookCRT;
    var localEndpoint = opts.localEndpoint;
    var middleware = opts.middleware;
    var adminUser = opts.adminUser;

    // Initialize Bot Instance
    bot = new Telegraf(token);

    // Set the Telegram server to initialize the webhook
    if (webhookRefresh) {
      console.log("Update Telegram webhook")
      bot.telegram.setWebhook(webhookURL, {
        source: webhookCRT
      }).then(ctx => {
        console.log("Webhook setup completed to " + webhookURL);
        console.log("Bot Status URL : https://api.telegram.org/bot" + token + "/getWebhookInfo");
      });
    } else {
      console.log("Skipo the webhook");
    }

    if (middleware) {
      // Set the Webhook Local Callback
      middleware.use(bot.webhookCallback(localEndpoint));
    }

    if (adminUser) {
      bot.telegram.sendMessage(adminUser, "👍 Hello World");
    }

    // Add Event Handler
    bot.on('sticker', (ctx) => processSticker(ctx));
    bot.on('message', (ctx) => processMessage(ctx));
    bot.command('start', ctx => {
      return ctx.reply('Hey ! Nice to meet you');
    })

    // Initialize Helpers
    financialHelper = financialHelper();
    paymentHelper = paymentHelper();
    visionHelper = visionHelper();
  };

  // Send Admin only message;
  app.sendAdmin = function (message) {
    if (opts.adminUser) {
      console.log(`Sending message to ${opts.adminUser} with message : ${message}`);
      bot.telegram.sendMessage(opts.adminUser, message);
    }
  }

  // Initialize the App
  app.init();
  return app;
}

function processSticker(ctx) {
  console.log("Incoming Sticker");
  ctx.reply('❤️');
}


function processMessage(ctx) {
  console.log(`Incoming ${ctx.message}`);

  let isHandled = false;
  isHandled = isHandled || financialHelper.handleRequest(ctx);
  isHandled = isHandled || paymentHelper.handleRequest(ctx);
  isHandled = isHandled || visionHelper.handleRequest(ctx);

  if (!isHandled)  ctx.reply('❤️👍');
}


exports = module.exports = createApplication;
