'use strict';

require('dotenv').config();
let axios = require("axios");

function createApplication(bot, opts) {
    var bot = bot;
    var opts = opts;
    var app = {};

    app.getOpts = function () {
        return opts;
    }

    app.init = function () {}

    app.handleRequest = function (ctx) {
        if (ctx.update.message.voice != null) {
            var fileID = ctx.update.message.voice.file_id;
            if (fileID != null) {
                var handler = ctx.telegram.getFile(fileID);
                handler.then(function (v) {
                    var url = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${v.file_path}`;
                    app.processRequest(ctx, url)
                });

            } else {
                ctx.reply("File is somehow error");
            }
            return true;
        }
        return false;
    }


    /**
     * Proceed Request
     * @param {Telegram Context} ctx 
     * @param {URL} url 
     */
    app.processRequest = function (ctx, url) {

        console.log(`Processing url : ${url}`);
        ctx.reply(`Extracting 🚘🚘🚘🚘 `);
        let headers = app.getHeader();

        let data = app.getBody(ctx, url);

        // Perform Post
        axios({
                method: "POST",
                url: process.env.GOOGLE_SPEECT_TO_TEXT_API,
                headers: headers,
                data: data
            })
            .then(function (response) {

                console.log(`Response : ${response.data.code}`);
                try {
                    if (response.data.code == "000") {
                        console.log(response.data)
                        let text = `${response.data.message}`;
                        ctx.reply(text);

                        setTimeout(() => {
                            ctx.reply("Translating");
                            app.proceedTranslate(ctx, text);
                        }, 1000);

                    } else {
                        ctx.reply("😱😱暫時未能提供....");
                    }
                } catch (exception) {
                    ctx.reply("😱😱😱暫時未能提供....");
                }
            })
            .catch(function (error) {
                ctx.reply("Unknown errors");
                console.log(error);
            });
    }

    app.getHeader = function () {
        let header = {
            "Content-Type": "application/json",
            "Authorization": process.env.GOOGLE_SPEECT_TO_TEXT_JWT_TOKEN
        }
        return header;
    }

    app.getBody = function (ctx, url) {
        let body = {
            "identify": process.env.GOOGLE_SPEECT_TO_TEXT_JWT_USER,
            "url": url
        }
        return body;
    }

    /**
     * Trigger API to translate Text
     * @param {Telegram Context} ctx 
     * @param {Text} text
     */
    app.proceedTranslate = function (ctx, text) {

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


    // Initialize the App
    app.init();
    return app;
}

exports = module.exports = createApplication;