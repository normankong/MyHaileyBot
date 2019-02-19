'use strict';

const Telegraf = require('telegraf');
var financialHelper = require('./financial_helper.js');
var paymentHelper = require('./payment_helper.js');
var visionHelper = require('./vision_helper.js');
const Extra = require('telegraf/extra');
const Markup = require('telegraf/markup');
const session = require('telegraf/session');

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
    // Add Event Handler
    bot.use(session());

    // Set the Telegram server to initialize the webhook
    if (webhookRefresh) {
      let options = {
        source: webhookCRT
      }
      options = (webhookCRT == "") ? null : options;

      console.log("Update Telegram webhook")
      bot.telegram.setWebhook(webhookURL, options).then(ctx => {
        console.log("Webhook setup completed to " + webhookURL);
        console.log("Bot Status URL : https://api.telegram.org/bot" + token + "/getWebhookInfo");
      });
    } else {
      console.log("Skip the webhook");
    }

    if (middleware) {
      // Set the Webhook Local Callback
      middleware.use(bot.webhookCallback(localEndpoint));
    }

    if (adminUser) {
      bot.telegram.sendMessage(adminUser, "👍 Hello World");
    }

    // Initialize Helpers
    financialHelper = financialHelper(bot, opts);
    paymentHelper = paymentHelper(bot, opts);
    visionHelper = visionHelper(bot, opts);

    // Event Handler
    bot.on('sticker', (ctx) => processSticker(ctx));
    bot.on('message', (ctx) => processMessage(ctx));

    bot.command('start', ctx => {
      return ctx.reply('Hey ! Nice to meet you');
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
  app.init();
  return app;
}

function processSticker(ctx) {
  console.log("Incoming Sticker");
  ctx.reply('❤️');
}


function processMessage(ctx) {
  console.debug(`Incoming ${ctx.message.text}`);

  let isHandled = false;
  isHandled = isHandled || showHelp(ctx);

  isHandled = isHandled || financialHelper.handleRequest(ctx);
  isHandled = isHandled || paymentHelper.handleRequest(ctx);
  isHandled = isHandled || visionHelper.handleRequest(ctx);

  if (!isHandled) ctx.reply('❤️👍');
}

function showHelp(ctx) {

  if (ctx.message.text != "?") return false;

  // @TODO further extend to sub menu
  var message = "Image Action : "
  const keyboard = Markup.inlineKeyboard([
    Markup.callbackButton('Translate ?', 'TRANSLATE'),
    Markup.callbackButton('Extract ?', 'EXTRACT'),
    Markup.callbackButton('Predict ?', 'PREDICT'),
  ])
  ctx.reply(message, Extra.HTML().markup(keyboard));

  // ctx.reply('One time keyboard', Markup
  //   .keyboard(['/simple', '/inline', '/pyramid'])
  //   .oneTime()
  //   .resize()
  //   .extra()
  // )
  return true;
}

exports = module.exports = createApplication;