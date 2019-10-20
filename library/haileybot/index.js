'use strict';
require('dotenv').config();

const Telegraf = require('telegraf');
const commandParts = require('telegraf-command-parts');
const Stage = require('telegraf/stage')
// const Scene = require('telegraf/scenes/base')
const Extra = require('telegraf/extra');
const Markup = require('telegraf/markup');
const session = require('telegraf/session');

var financialHelper = require('./financial_helper.js');
var weatherHelper = require('./weather_helper.js');
var paymentHelper = require('./payment_helper.js');
var visionHelper = require('./vision_helper.js');
var translateHelper = require('./translate_helper.js');
var voiceHelper = require('./voice_helper.js');
var busHelper = require('./bus_helper.js');
var tripHelper = require('./trip_helper.js');
var cacheHelper = require("./cache_helper.js");
var sceneHelper = require("./scene_helper.js");
var userProfileHelper = require("./user_profile_helper.js");


const util = require('util');
const DEFAULT_ACTION = process.env.DEFAULT_ACTION;

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
      telegram: {
        webhookReply: false
      }
    };

    // Initialize Bot Instance
    bot = new Telegraf(token, config);
    // Add Event Handler
    bot.use(session());
    bot.use(commandParts());

    // Initial Stage / Scene
    sceneHelper = sceneHelper(bot, opts);
    let stageList = sceneHelper.getSceneList();
    const stage = new Stage(stageList, {
      ttl: 0
    })
    bot.use(stage.middleware())

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
      bot.telegram.sendMessage(adminUser, "👍 Hello World", {
        parse_mode: "Markdown"
      });
    }

    // Initialize Helpers
    financialHelper = financialHelper(bot, opts);
    paymentHelper = paymentHelper(bot, opts);
    translateHelper = translateHelper(bot, opts);
    visionHelper = visionHelper(bot, opts).setTranslateHelper(translateHelper);
    busHelper = busHelper(bot, opts);
    voiceHelper = voiceHelper(bot, opts).setTranslateHelper(translateHelper);
    tripHelper = tripHelper(bot, opts);
    weatherHelper = weatherHelper(bot, opts);
    cacheHelper = cacheHelper(bot, opts);
    userProfileHelper = userProfileHelper(bot, opts);

    // Assign itself to myBot instance
    opts.myBot = app;
    opts.cacheHelper = cacheHelper;
    opts.userProfileHelper = userProfileHelper;

    // Set Event
    app.initEvent(bot);


    bot.command('start', ctx => {
      return ctx.reply('Hey ! Nice to meet you');
    })


    bot.launch();
  };

  // Send Message List with markdown
  app.sendMarkdown = function (list, message) {
    app.sendMessage(list, `\`\`\`\n${message}\`\`\``, {
      parse_mode: "Markdown"
    });
  }

  // Send Message List
  app.sendMessage = function (list, message, extra) {
    for (let i = 0; i < list.length; i++) {
      console.log(`Sending message to ${list[i]} with message : ${message}`);
      bot.telegram.sendMessage(list[i], message, extra);
    }
  }

  // Send Admin only message;
  app.sendAdmin = function (message, extra) {
    if (opts.adminUser) {
      console.log(`Sending message to ${opts.adminUser} with message : ${message}`);
      bot.telegram.sendMessage(opts.adminUser, message, extra);
    }
  }

  // Send Admin with Markdown
  app.sendAdminMarkdown = function (message) {
    app.sendAdmin(`\`\`\`\n${message}\`\`\``, {
      parse_mode: "Markdown"
    });
  }

  // Send Admin image;
  app.sendImage = function (buffer) {
    if (opts.adminUser) {
      let list = opts.adminUser.split(",");
      for (let i = 0; i < list.length; i++) {
        console.log(`Sending image to ${list[i]}`);
        bot.telegram.sendPhoto(list[i], {
          source: buffer
        });
      }
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
    bot.action('SUBSCRIBE', (ctx) => app.subscribe(ctx));
  }


  app.processSticker = function (ctx) {
    console.log("Incoming Sticker");
    ctx.reply('❤️');
  }

  app.processMessage = async function (ctx) {
    console.debug(`Incoming request`);
    console.log(JSON.stringify(ctx.message));

    // console.log(util.inspect(ctx))
    // console.log(ctx.message.location);

    // Init Profile (Create if not found, then cache in session)
    opts.userProfileHelper.initProfile(ctx);


    // Set Default Action;
    if (ctx.session.action == null) ctx.session.action = DEFAULT_ACTION;

    let isHandled = false;
    isHandled = isHandled || app.handleRequest(ctx);
    isHandled = isHandled || app.showHint(ctx);

    isHandled = isHandled || financialHelper.handleRequest(ctx);
    isHandled = isHandled || paymentHelper.handleRequest(ctx);
    isHandled = isHandled || visionHelper.handleRequest(ctx);
    isHandled = isHandled || busHelper.handleRequest(ctx);
    isHandled = isHandled || voiceHelper.handleRequest(ctx);
    isHandled = isHandled || tripHelper.handleRequest(ctx);
    isHandled = isHandled || weatherHelper.handleRequest(ctx);
    isHandled = isHandled || translateHelper.handleRequest(ctx); // It must be the last one as it will perform translate

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



  app.handleRequest = function (ctx) {
    if (ctx.message.entities != null && ctx.message.entities[0].type == "bot_command") {
      switch (ctx.state.command.command) {
        case "subscribe":
          ctx.scene.enter('subscribe');
          break;
        case "unsubscribe":
          ctx.scene.enter('unsubscribe');
        default:
          break;
      }

      return true;
    }

    return false;;
  }

  app.handleScheduler = function (query) {
    console.log(`HaileyBot handle scheduler task`);
    let isHandled = false;
    isHandled = isHandled || financialHelper.handleScheduler(query);
    isHandled = isHandled || paymentHelper.handleScheduler(query);
    isHandled = isHandled || translateHelper.handleScheduler(query);
    isHandled = isHandled || visionHelper.handleScheduler(query);
    isHandled = isHandled || busHelper.handleScheduler(query);
    isHandled = isHandled || voiceHelper.handleScheduler(query);
    isHandled = isHandled || tripHelper.handleScheduler(query);
    isHandled = isHandled || weatherHelper.handleScheduler(query);
  }

  // Initialize the App
  app.init();
  return app;
}

exports = module.exports = createApplication;