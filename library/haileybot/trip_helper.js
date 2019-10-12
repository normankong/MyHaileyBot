'use strict';

let axios = require("axios");
const Extra = require('telegraf/extra');
const Markup = require('telegraf/markup');

const TRIP_ACTION = "TRIP"

function createApplication(bot, opts) {
    var bot = bot;
    var opts = opts;
    var app = {};

    app.getOpts = function () {
        return opts;
    }

    app.init = function () {}

    app.handleRequest = function (ctx) {

        // If calling me
        if (app.getAction(ctx) != TRIP_ACTION) return false;

        // Retrieve the Photo URL
        if (ctx.message.photo != null) {
            console.log("Retrieve the Photo URL");
            app.determineURL(ctx);
            return true;
        }
        // Retrieve the Location then proceed the Download
        if (ctx.session.url != null && ctx.message.location != null) {
            console.log("Retrieve the Location then proceed the Download");
            app.processUpload(ctx);
            return true;
        }
        return false;
    }

    app.determineURL = function (ctx) {

        // Use the biggest files
        var fileID = ctx.message.photo[ctx.message.photo.length - 1].file_id;
        if (fileID != null) {
            var handler = ctx.telegram.getFile(fileID);
            handler.then(function (v) {
                var url = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${v.file_path}`;

                // Cache the URL in session
                ctx.session.url = url;

                // app.proceedAPITrigger(ctx, url);

                // Generate Asking Info
                const keyboard = Extra.markup(markup =>
                    markup
                    .oneTime()
                    .resize()
                    .keyboard([
                        markup.locationRequestButton('Please give me location')
                    ])
                )
                ctx.replyWithMarkdown(`😘亲 : 在那裹影 ?`, keyboard);
            });
        } else {
            ctx.reply("File is somehow error");
        }
    }

    app.processUpload = function (ctx) {
        let url = ctx.session.url;

        let location = ctx.message.location;
        let latitude = location.latitude;
        let longitude = location.longitude;

        let geocodeURL = process.env.GOOGLE_GEOCODE_API;
        let geocodeKey = process.env.GOOGLE_GEOCODE_API_KEY;

        geocodeURL = geocodeURL.replace("{{LATITUDE}}", latitude);
        geocodeURL = geocodeURL.replace("{{LONGITUDE}}", longitude);
        geocodeURL = geocodeURL.replace("{{API_KEY}}", geocodeKey);


        axios.get(geocodeURL)
            .then(response => {
                let metadata = {
                    username : ctx.message.from,
                    date : ctx.message.date,
                    latitude: latitude,
                    longitude: longitude,
                    placeName: response.data.results[0].formatted_address,
                    fullAddress: response.data
                }
                app.proceedAPITrigger(ctx, url, metadata);
            })
            .catch(error => {
                console.log(error);
            });
    }
    /**
     * Trigger API to return Text
     * @param {Telegram Context} ctx 
     * @param {URL for the image} url 
     */
    app.proceedAPITrigger = function (ctx, url, metadata) {
        
        console.log(`Download file ${url} with location ${metadata.latitude} ${metadata.longitude} ${metadata.placeName}`);
        ctx.reply(`🌩🌩🌩 上傳中 ${metadata.placeName}`); 
        // Perform Post
        axios({
                method: "POST",
                url: process.env.GOOGLE_STORAGE_API,
                headers: app.getHeader(),
                data: app.getBody(ctx, url, metadata)
            })
            .then(function (response) {

                console.log(`GCP Storage API : ${response.data.code}`);
                if (response.data.code == "000") {
                    ctx.reply(`Upload to ${response.data.filename}`);
                    ctx.session.url = null;
                } else {
                    ctx.reply(response.data.message);
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

    app.getHeader = function () {
        return {
            "Content-Type": "application/json",
            "Authorization": process.env.GOOGLE_STORAGE_JWT_TOKEN
        }
    }

    app.getBody = function (ctx, url, metadata) {
        let body = {
            "identify": process.env.GOOGLE_STORAGE_JWT_USER,
            "url": url, 
            "metadata" : metadata
        }
        // console.log(body);
        return body;
    }

    // Initialize the App
    app.init();
    return app;
}

exports = module.exports = createApplication;