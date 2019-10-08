'use strict';

require('dotenv').config();
let axios = require("axios");

function createApplication(bot, opts) {
    var bot = bot;
    var opts = opts;
    var translateHelper = null;
    var app = {};

    app.getOpts = function () {
        return opts;
    }

    app.init = function () {
        let config = require(process.env.GOOGLE_TRANSLATE_CONFIG_FILE);
    }

    app.setTranslateHelper = function(inTranslateHelper)
    {
        translateHelper = inTranslateHelper;
        translateHelper.setVoiceHelper(app);
        return app;
    }

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

        // Perform Speech To Text
        axios({
                method: "POST",
                url: process.env.GOOGLE_SPEECH_TO_TEXT_API,
                headers: app.getSpeechToTextHeader(),
                data: app.getSpeechToTextBody(ctx, url)
            })
            .then(function (response) {
                console.log(`Response : ${response.data.code}`);
                try {
                    if (response.data.code == "000") {
                        console.log(`Extracted : ${response.data.message}`);
                        let text = `${response.data.message}`;
                        ctx.reply(`解讀 : ${text}`);

                        setTimeout(() => {
                            app.proceedTranslate(ctx, text);
                        }, 100);

                    } else {
                        ctx.reply("😱😱暫時未能提供....");
                    }
                } catch (exception) {
                    ctx.reply("😱😱😱暫時未能提供....");
                }
            })
            .catch(function (error) {
                ctx.reply("😱😱😱Google 又翻譯唔到。。。唔洗錢就係咁");
                console.log(error);
            });
    }


    /**
     * Trigger API to translate Text
     * @param {Telegram Context} ctx 
     * @param {Text} text
     */
    app.proceedTranslate = function (ctx, text) {
        console.log(`app.proceedTranslate ${text}`);
        
        translateHelper.processTranslate(ctx, text, (translatedText) => {
            setTimeout(() => {
                app.proceedTextToSpeech(ctx, translatedText);
            }, 100);
        });
    };

    app.proceedTextToSpeech = function (ctx, text) {
        //ctx.reply("😀說話中");
       
        axios({
                method: "POST",
                url: process.env.GOOGLE_TEXT_TO_SPEECH_API,
                headers: app.getTextToSpeechHeader(),
                data: app.getTextToSpeechBody(ctx, text)
            })
            .then(function (response) {

                console.log(`Text to speech Response : ${response.data.code}`);
                if (response.data.code == "000") {
                    let message = response.data.message;
                    let buff = Buffer.from(message, 'base64');

                    ctx.replyWithVoice({
                        source: buff
                    });
                }
            })
            .catch(function (error) {
                ctx.reply("TEXT_TO_SPEECH_API Unknown errors");
                console.log(error);
            });
    }

    app.getSpeechToTextHeader = function () {
        return {
            "Content-Type": "application/json",
            "Authorization": process.env.GOOGLE_SPEECH_TO_TEXT_JWT_TOKEN
        }
    }

    app.getSpeechToTextBody = function (ctx, url) {
        return {
            "identify": process.env.GOOGLE_SPEECH_TO_TEXT_JWT_USER,
            "url": url
        }
    }

    app.getTextToSpeechHeader = function () {
        return {
            "Content-Type": "application/json",
            "Authorization": process.env.GOOGLE_TEXT_TO_SPEECH_JWT_TOKEN
        }
    }

    app.getTextToSpeechBody = function (ctx, text) {
        if (ctx.session.language == null) ctx.session.language = process.env.DEFAULT_LANGUAGE_CODE;
        
        return {
            "identify": process.env.GOOGLE_TEXT_TO_SPEECH_JWT_USER,
            "text": text,
            "languageCode": ctx.session.language
        };
    }

    // Initialize the App
    app.init();
    return app;
}

exports = module.exports = createApplication;