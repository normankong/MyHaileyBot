'use strict';
require('dotenv').config();

const Telegraf = require('telegraf');
var financialHelper = require('./financial_helper.js');
var paymentHelper = require('./payment_helper.js');
var visionHelper = require('./vision_helper.js');
var translateHelper = require('./translate_helper.js');
var voiceHelper = require('./voice_helper.js');
var busHelper = require('./bus_helper.js');
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
    translateHelper = translateHelper(bot, opts);
    busHelper = busHelper(bot, opts);
    voiceHelper = voiceHelper(bot, opts);

    // Event Handler
    bot.on('sticker', (ctx) => processSticker(ctx));
    bot.on('message', (ctx) => processMessage(ctx));
    bot.action('CLEAR', (ctx) => app.clearAction(ctx));

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

  // Send Admin image;
  app.sendImage = function (buffer) {
    if (opts.adminUser) {
      console.log(`Sending image to ${opts.adminUser}`);
      bot.telegram.sendPhoto(opts.adminUser, {
        source: buffer
      });
    }
  }

  app.clearAction = function (ctx) {
    console.log(`Clear all action`);
    ctx.session.action = null
    ctx.reply("Clear all action");
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
  console.debug(`Incoming request`);

  let isHandled = false;
  isHandled = isHandled || showHint(ctx);

  isHandled = isHandled || financialHelper.handleRequest(ctx);
  isHandled = isHandled || paymentHelper.handleRequest(ctx);
  isHandled = isHandled || visionHelper.handleRequest(ctx);
  isHandled = isHandled || translateHelper.handleRequest(ctx);
  isHandled = isHandled || busHelper.handleRequest(ctx);
  isHandled = isHandled || voiceHelper.handleRequest(ctx);
  if (!isHandled) ctx.reply('❤️👍');
}

function showHint(ctx) {

  if (ctx.message.text == "?") {
    var message = "Please Select Action"
    const keyboard = Markup.inlineKeyboard([
      Markup.callbackButton('Translate ?', 'TRANSLATE'),
      Markup.callbackButton('Extract ?', 'EXTRACT'),
      Markup.callbackButton('Predict ?', 'PREDICT'),
      Markup.callbackButton('Clear ?', 'CLEAR'),
    ])
    ctx.reply(message, Extra.HTML().markup(keyboard));
    return true;
  }

  switch (ctx.message.text) {
    case "1":
    case "2":
    case "3":
    case "4":
    case "5":
    case "6":
    case "7":
    case "8":
    case "9":
      return busHelper.showMenu(ctx);
      break;
    default:
      break;
  }


  return false;
}

exports = module.exports = createApplication;