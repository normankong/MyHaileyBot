'use strict';
require('dotenv').config();

const Telegraf = require('telegraf');
var financialHelper = require('./financial_helper.js');
var paymentHelper = require('./payment_helper.js');
var visionHelper = require('./vision_helper.js');
var translateHelper = require('./translate_helper.js');
var voiceHelper = require('./voice_helper.js');
var busHelper = require('./bus_helper.js');
var tripHelper = require('./trip_helper.js');
const Extra = require('telegraf/extra');
const Markup = require('telegraf/markup');
const session = require('telegraf/session');
const util = require('util');
const DEFAULT_ACTION = "TRIP";

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

    const config = {
      telegram: { webhookReply: false }
    };

    // Initialize Bot Instance
    bot = new Telegraf(token, config);
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
    translateHelper = translateHelper(bot, opts);
    visionHelper = visionHelper(bot, opts).setTranslateHelper(translateHelper);
    busHelper = busHelper(bot, opts);
    voiceHelper = voiceHelper(bot, opts).setTranslateHelper(translateHelper);
    tripHelper = tripHelper(bot, opts);

    // Set Event
    app.initEvent(bot);

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

  app.setAction = function (ctx) {
    console.log(`Action : ${ctx.match}`);
    ctx.session.action = ctx.match;
    ctx.reply("Update Session Action " + ctx.match);
  }

  app.initEvent = function (bot) {

    // Event Handler
    bot.on('sticker', (ctx) => app.processSticker(ctx));
    bot.on('message', (ctx) => app.processMessage(ctx));

    // Set Action Button
    bot.action('CLEAR', (ctx) => ctx.session.action = null);
    bot.action('TRIP', (ctx) => app.setAction(ctx));
    bot.action('PREDICT', (ctx) => app.setAction(ctx));
    bot.action('TRANSLATE', (ctx) => app.setAction(ctx));
  }


  app.processSticker = function (ctx) {
    console.log("Incoming Sticker");
    ctx.reply('❤️');
  }


  app.processMessage = function (ctx) {
    console.debug(`Incoming request`);
    //  console.log(util.inspect(ctx))
    console.log(JSON.stringify(ctx.message));
    // console.log(ctx.message.location);

    // Set Default Action;
    if (ctx.session.action == null) ctx.session.action = DEFAULT_ACTION;

    let isHandled = false;
    isHandled = isHandled || app.showHint(ctx);

    isHandled = isHandled || financialHelper.handleRequest(ctx);
    isHandled = isHandled || paymentHelper.handleRequest(ctx);
    isHandled = isHandled || visionHelper.handleRequest(ctx);
    isHandled = isHandled || translateHelper.handleRequest(ctx);
    isHandled = isHandled || busHelper.handleRequest(ctx);
    isHandled = isHandled || voiceHelper.handleRequest(ctx);
    isHandled = isHandled || tripHelper.handleRequest(ctx);

    if (!isHandled) ctx.reply('❤️👍');
  }


  app.showHint = function (ctx) {

    if (ctx.message.text == "?") {
      var message = "Please Select Action"
      const keyboard = Markup.inlineKeyboard([
        Markup.callbackButton('Translate ?', 'TRANSLATE'),
        Markup.callbackButton('Extract ?', 'EXTRACT'),
        Markup.callbackButton('Trip ?', 'TRIP'),
        Markup.callbackButton('Clear ?', 'CLEAR'),
      ])
      ctx.reply(message, Extra.HTML().markup(keyboard));
      return true;
    }

    if (ctx.message.text == "0") {
      translateHelper.showMenu(ctx);
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
        busHelper.showMenu(ctx);
        return true;
    }

    return false;
  }

  // Initialize the App
  app.init();
  return app;
}




exports = module.exports = createApplication;