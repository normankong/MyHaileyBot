'use strict';

let axios = require("axios");
const DEFAULT_ACTION = "EXTRACT"

function createApplication(bot, opts) {
    var bot = bot;
    var opts = opts;
    var translateHelper;
    var app = {};

    app.getOpts = function () {
        return opts;
    }

    app.setTranslateHelper = function(inTranslateHelper)
    {
        translateHelper = inTranslateHelper;
        return app;
    }

    app.init = function () {
        bot.action('EXTRACT', (ctx) => app.setAction(ctx));
        bot.action('PREDICT', (ctx) => app.setAction(ctx));
    }

    app.handleRequest = function (ctx) {
        // Proceed Vision API
        if (ctx.message.photo != null) {
            app.proceedVision(ctx);
            return true;
        }
        return false;
    }

    app.proceedVision = function (ctx) {
        ctx.reply("One moment please....")

        // Use the biggest files
        var fileID = ctx.message.photo[ctx.message.photo.length - 1].file_id;
        if (fileID != null) {
            var handler = ctx.telegram.getFile(fileID);
            handler.then(function (v) {
                var url = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${v.file_path}`;
                app.proceedAPITrigger(ctx, url);
            });
        } else {
            ctx.reply("File is somehow error");
        }
    }
    /**
     * Trigger API to return Text
     * @param {Telegram Context} ctx 
     * @param {URL for the image} url 
     */
    app.proceedAPITrigger = function (ctx, url) {

        console.log(url + " : " + app.getAction(ctx));

        // Perform Post
        axios({
                method: "POST",
                url: process.env.GOOGLE_VISION_TEXT_API,
                headers: app.getHeader(),
                data: app.getBody(ctx, url)
            })
            .then(function (response) {

                console.log(`Vision Helper Response : ${response.data}`);
                if (response.data.code == "000") {
                    let text = response.data.message;
                    ctx.reply(text);

                    // Additional Translation Call if necesary 
                    if (app.getAction(ctx) == "TRANSLATE") {
                        setTimeout(() => {
                            ctx.reply("Translating");
                            app.proceedTranslate(ctx, text);
                        }, 1000);
                    }
                } else {
                    ctx.reply("Image do not contain any text");
                }
            })
            .catch(function (error) {
                ctx.reply("Unknown errors");
                console.log(error);
            });
    };

    app.getAction = function (ctx) {
        if (ctx.session.action == null) ctx.session.action = DEFAULT_ACTION;
        return ctx.session.action;
    }

    app.setAction = function (ctx) {
        console.log(`Action : ${ctx.match}`);
        ctx.session.action = ctx.match;
        ctx.reply("Update Session Action " + ctx.match);
    }

    /**
     * Trigger API to translate Text
     * @param {Telegram Context} ctx 
     * @param {Text} text
     */
    app.proceedTranslate = function (ctx, text) {
        console.log("app.proceedTranslate");
        let params = {text : text, lang : "zh-TW"};
        translateHelper.processTranslate(ctx, params, (translatedText) => {
           ctx.reply(translatedText);
        });
    };

    app.getHeader = function () {
        let header = {
            "Content-Type": "application/json",
            "Authorization": process.env.GOOGLE_VISION_TEXT_JWT_TOKEN
        }
        return header;
    }

    app.getBody = function (ctx, url) {
        let body = {
            "identify": process.env.GOOGLE_VISION_TEXT_JWT_USER,
            "url": url
        }

        return body;
    }

    // Initialize the App
    app.init();
    return app;
}

exports = module.exports = createApplication;