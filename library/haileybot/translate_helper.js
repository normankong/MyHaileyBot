'use strict';

let axios = require("axios");
const TRANSLATE_ACTION = "TRANSLATE";
const Markup = require('telegraf/markup');
const Extra = require('telegraf/extra');

function createApplication(bot, opts) {
    var bot = bot;
    var opts = opts;
    var voiceHelper = null;
    var app = {};
    let languageMap = [];
    
    app.getOpts = function () {
        return opts;
    }

    app.setVoiceHelper = function (inVoiceHelper) {
        voiceHelper = inVoiceHelper;
        return app;
    }

    app.init = function () {

        let config = require(process.env.GOOGLE_TRANSLATE_CONFIG_FILE);
        for (let i = 0; i < config.data.length; i++) {
            let object = config.data[i];
            bot.action(object.code, (ctx) => app.setTargetLanguage(ctx));

            // Initialize the Language Map
            languageMap[object.code] = object;
        }
    }

    app.handleRequest = function (ctx) {
        if (app.getAction(ctx) != TRANSLATE_ACTION) return false;
        if (ctx.message.text == null) return false;

        app.processTranslate(ctx);
        return true;
    }

    app.processTranslate = function (ctx, text, callback) {
        if (text == null) text = ctx.message.text;
        app.proceedAPITrigger(ctx, text, callback);
    }

    /**
     * Trigger API to return Text
     * @param {Telegram Context} ctx 
     * @param {URL for the image} url 
     */
    app.proceedAPITrigger = function (ctx, text, callback) {

        ctx.reply("😀翻譯中");

        console.log(`Proceed Translate : ${text}`);

        // Perform Post
        axios({
                method: "POST",
                url: process.env.GOOGLE_TRANSLATE_API,
                headers: app.getHeader(),
                data: app.getBody(ctx, text)
            })
            .then(function (response) {

                console.log(`Translate Helper Response : ${JSON.stringify(response.data)}`);
                if (response.data.code == "000") {

                    // Show the Translate response: 
                    ctx.reply(`翻譯 : ${response.data.message}`);

                    // Trigger callback if any
                    if (callback) {
                        callback(response.data.message);
                    } else {
                        setTimeout(() => {
                            app.proceedTextToSpeech(ctx, response.data.message);
                        }, 1000);
                    }

                } else {
                    ctx.reply("Unable to Translate");
                }
            })
            .catch(function (error) {
                ctx.reply("Unknown errors");
                console.log(error);
            });
    };


    /**
     * Trigger API to text to Speech
     * @param {Telegram Context} ctx 
     * @param {Text} text
     */
    app.proceedTextToSpeech = function (ctx, text) {
        console.log("app.proceedTextToSpeech");

        voiceHelper.proceedTextToSpeech(ctx, text);
    };

    app.getAction = function (ctx) {
        return ctx.session.action;
    }

    app.getHeader = function () {
        return {
            "Content-Type": "application/json",
            "Authorization": process.env.GOOGLE_TRANSLATE_JWT_TOKEN
        }
    }

    app.getBody = function (ctx, text) {
        return {
            "identify": process.env.GOOGLE_TRANSLATE_JWT_USER,
            "text": text,
            "lang": app.getTargetLanguage(ctx)
        }
    }


    app.setTargetLanguage = function (ctx) {
        ctx.session.language = ctx.match;
        ctx.reply(`已選擇翻譯語言 : ${languageMap[ctx.session.language].desc}`)
    }

    app.getTargetLanguage = function (ctx) {
        if (ctx.session.language == null) ctx.session.language = process.env.DEFAULT_LANGUAGE_CODE;
        return languageMap[ctx.session.language].translateCode;
    }

    app.showMenu = function (ctx) {
        var message = "請選擇翻譯語言 😎😎😎"

        let config = require(process.env.GOOGLE_TRANSLATE_CONFIG_FILE);
        let callbackButtonList = [];
        for (let i = 0; i < config.data.length; i++) {
            let object = config.data[i];
            callbackButtonList.push(Markup.callbackButton(object.desc, object.code));
        }

        const keyboard = Markup.inlineKeyboard(callbackButtonList);
        // [
        //     Markup.callbackButton('中文', 'zh-TW'),
        //     Markup.callbackButton('英文', 'en'),
        //     Markup.callbackButton('日文', 'ja'),
        //     Markup.callbackButton('韓文', 'ko'),
        // ])
        ctx.reply(message, Extra.HTML().markup(keyboard));
        return true;
    }

    app.handleScheduler = function (query) {
        return false;
    }

    // Initialize the App
    app.init();
    return app;
}

exports = module.exports = createApplication;