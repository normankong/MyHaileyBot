'use strict';

let axios = require("axios");
const TRANSLATE_ACTION = "TRANSLATE"

function createApplication(bot, opts) {
    var bot = bot;
    var opts = opts;
    var app = {};

    app.getOpts = function () {
        return opts;
    }

    app.init = function () {
        bot.action('TRANSLATE', (ctx) => app.setAction(ctx));
    }

    app.handleRequest = function (ctx) {

        if (app.getAction(ctx) != TRANSLATE_ACTION) return false;
        if (ctx.message.text == null) return false;

        app.processTranslate(ctx);
        return true;
    }

    app.processTranslate = function (ctx) {
        ctx.reply(`Translating ${ctx.message.text}`)
        var text = ctx.message.text;
        app.proceedAPITrigger(ctx, text);
    }
    /**
     * Trigger API to return Text
     * @param {Telegram Context} ctx 
     * @param {URL for the image} url 
     */
    app.proceedAPITrigger = function (ctx, text) {

        console.log(text + " : " + app.getAction(ctx));
        var header = {
            headers: {
                'Content-Type': 'application/json',
            }
        };
        var data = {
            text: text
        };

        // Perform Post
        axios({
                method: "POST",
                url: process.env.GOOGLE_TRANSLATE_API,
                headers: header,
                data: data
            })
            .then(function (response) {

                console.log(`Response : ${response.data.code} : ${response.data.message}`);
                if (response.data.code == "000") {
                    ctx.reply(response.data.message)
                } else {
                    ctx.reply("Unable to Translate");
                }
            })
            .catch(function (error) {
                ctx.reply("Unknown errors");
                console.log(error);
            });
    };

    app.getAction = function (ctx) {
        return ctx.session.action;
    }

    app.setAction = function (ctx) {
        console.log(`Action : ${ctx.match}`);
        ctx.session.action = ctx.match;
        ctx.reply("Update action " + ctx.match);
    }

    // Initialize the App
    app.init();
    return app;
}

exports = module.exports = createApplication;