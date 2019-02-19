'use strict';

let axios = require("axios");
const DEFAULT_ACTION = "EXTRACT"

function createApplication(bot, opts) {
    var bot = bot;
    var opts = opts;
    var app = {};

    app.getOpts = function () {
        return opts;
    }

    app.init = function () {
        bot.action('TRANSLATE', (ctx) => app.setAction(ctx));
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
        var header = {
            headers: {
                'Content-Type': 'application/json',
            }
        };
        var data = {
            url: url,
            action: app.getAction(ctx)
        };

        // Perform Post
        axios({
                method: "POST",
                url: process.env.GOOGLE_VISION_TEXT_API,
                headers: header,
                data: data
            })
            .then(function (response) {

                console.log(`Response : ${response.data.code} : ${response.data.message}`);
                if (response.data.code == "000") {
                    ctx.reply(response.data.message)
                } else {
                    ctx.reply("Image do not contain any text");
                }
            })
            .catch(function (error) {
                ctx.reply("Unknown errors");
                console.log(error);
            });
    };

    app.getAction = function getAction(ctx) {
        if (ctx.session.imageAction == null) ctx.session.imageAction = DEFAULT_ACTION;
        return ctx.session.imageAction;
    }

    app.setAction = function setAction(ctx) {
        console.log(`Action : ${ctx.match}`);
        ctx.session.imageAction = ctx.match;
        ctx.reply("Update Default Image action " + ctx.match);
    }

    // Initialize the App
    app.init();
    return app;
}

exports = module.exports = createApplication;