'use strict';

require('dotenv').config();
const request = require('request');
const leftPad = require("left-pad");
const Extra = require('telegraf/extra');
const Markup = require('telegraf/markup');
let axios = require("axios");
var moment = require('moment');
require("moment-timezone");

function createApplication(bot, opts) {
    var bot = bot;
    var opts = opts;
    var app = {};

    app.getOpts = function () {
        return opts;
    }

    app.init = function () {
        // let config = require(process.env.BUS_CONFIG_FILE);
        // for (var i = 0; i < config.data.length; i++) {
        //     let routeObject = config.data[i];
        //     let routeID = `${routeObject.busRoute}-${routeObject.bsiCode}`;
        //     bot.action(routeID, (ctx) => app.proceedBusMenu(ctx, routeObject));
        // }
    }

    app.handleRequest = function (ctx) {

        var msg = ctx.message.text;
        let config = require(process.env.BUS_CONFIG_FILE);
        for (var i = 0; i < config.data.length; i++) {
            let routeObject = config.data[i];
            let desc = `${routeObject.busRoute} : ${routeObject.desc}`;
            if (msg == desc)
            {
                app.proceedBusMenu(ctx, routeObject);
                return true;
            }
        }
        return false;
    }


    app.proceedBusMenu = function (ctx, routeObject) {
        return app.proceedBusRequest(ctx, routeObject.busRoute, routeObject.bsiCode, routeObject.busBound);
    }
    /**
     * Proceed Stock Quote
     * @param {Telegram Context} ctx 
     * @param {busRoute} busRoute 
     */
    app.proceedBusRequest = function (ctx, busRoute, bsiCode, busBound) {
        let url = process.env.BUS_API_URL;

        console.log(`Processing url : ${url} : ${busRoute}`);
        ctx.reply(`資料查詢中🚘🚘🚘 ${busRoute}`);
        let headers = app.getHeader();
        let data = app.getBody(busRoute, bsiCode, busBound);

        // Perform Post
        axios({
                method: "POST",
                url: url,
                headers: headers,
                data: data
            })
            .then(function (response) {

                console.log(`Response : ${response.data.code}`);
                if (response.data.code == "000") {
                    let cName = response.data.data.route.CName;
                    let oriCName = response.data.data.basicInfo.OriCName;
                    let destCName = response.data.data.basicInfo.DestCName;
                    let AirFare = parseFloat(response.data.data.route.AirFare);
                    let rows = [];
                    let rawResponse = response.data.data.raw.data.response;
                    if (rawResponse != null) {
                        for (var i = 0; i < rawResponse.length; i++) {
                            rows.push(rawResponse[i].t);
                        }
                    } else {
                        rows.push('😱😱😱暫時未能提供....')
                    }

                    let replyMsg = `現在時間 ${moment.tz(new Date(), "Asia/Hong_Kong").format("HH:mm")}\n`;
                    replyMsg += `車站 : ${cName} \n`;
                    replyMsg += `起點 : ${oriCName}\n`;
                    replyMsg += `終站 : ${destCName}\n`;
                    replyMsg += `車費 : ${AirFare} \n`;
                    replyMsg += `班次 : \n - ${rows.join("\n - ")}\n`;
                    replyMsg += `🚎🚌🚎🚌🚎🚌🚎🚌🚎🚌`;

                    ctx.reply(replyMsg)
                } else {
                    ctx.reply("Unable to process");
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
            "Authorization": process.env.BUS_JWT_TOKEN
        }
        return header;
    }

    app.getBody = function (busRoute, bsiCode, busBound) {
        var body = {
            "identify": process.env.BUS_JWT_USER,
            "busRoute": busRoute,
            "bsiCode": bsiCode,
            "busBound": busBound
        }
        return body;
    }

    app.showMenu = function (ctx) {
        var message = "請選擇路線 😎😎😎"

        let keyboardList = [];
        let rowList = [];
        let config = require(process.env.BUS_CONFIG_FILE);
        for (var i = 0; i < config.data.length; i++) {
            let routeObject = config.data[i];
            let key = routeObject.key;
            if (key != ctx.message.text) continue;
            let desc = `${routeObject.busRoute} : ${routeObject.desc}`;
            rowList.push(desc);
            
            if (rowList.length == 3) {
                keyboardList.push(rowList.slice(0));
                rowList = [];
            }
        }

        if (rowList.length != 0 ) keyboardList.push(rowList.slice(0));

        ctx.reply(message, Markup
            .keyboard(keyboardList)
            .oneTime()
            .resize()
            .extra()
        )

        return true;
    }

    // Initialize the App
    app.init();
    return app;
}

exports = module.exports = createApplication;