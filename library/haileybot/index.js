'use strict';

const Telegraf = require('telegraf');

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
    }

    if (middleware) {
      // Set the Webhook Local Callback
      middleware.use(bot.webhookCallback(localEndpoint));
    }

    if (adminUser) {
      bot.telegram.sendMessage(adminUser, "👍 Hello World");
    }

    // Add Event Handler
    bot.on('sticker', (ctx) => ctx.reply('❤️'));
    bot.on('message', (ctx) => ctx.reply('👍'));
    bot.command('start', ctx => {
      return ctx.reply('Hey')
    })
  };

  // Send Admin only message;
  app.sendAdmin = function (message) {
    if (opts.adminUser) {
      console.log(`Sending message to ${opts.adminUser} with message : ${message}`);
      bot.telegram.sendMessage(opts.adminUser, message);
    }
  }

  // Initialize the App
  app.init(opts);
  return app;
}

exports = module.exports = createApplication;