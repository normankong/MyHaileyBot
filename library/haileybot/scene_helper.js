'use strict';

const Scene = require('telegraf/scenes/base')
const Markup = require('telegraf/markup');

function createApplication(bot, opts) {
    var bot = bot
    var opts = opts;
    var app = {};
    var sceneList = [];
    var SUSBSCRIBE_TYPE_LIST = process.env.SUSBSCRIBE_TYPE_LIST.split(',');

    app.getOpts = function () {
        return opts;
    }

    app.init = function () {}

    app.getSceneList = function () {
        sceneList.push(app.getSubscribeScene());
        sceneList.push(app.getUnSubscribeScene());
        sceneList.push(app.getStockSubscribeScene());
        return sceneList;
    }

    // Subscriber Scene
    app.getSubscribeScene = function () {
        const scene = new Scene('subscribe');
        scene.enter((ctx) => {
            ctx.reply("Please select subscription", Markup
                .keyboard(SUSBSCRIBE_TYPE_LIST)
                .oneTime()
                .resize()
                .extra()
            );
        });
        scene.on('message', async (ctx) => {
            let userid = ctx.message.from.id;
            let type = ctx.message.text;
            if (SUSBSCRIBE_TYPE_LIST.indexOf(type) != -1) {

                // Check Subscribed or not
                let profile = await opts.userProfileHelper.getProfile(ctx);
                if (profile.subscribedList == null) profile.subscribedList = [];
                if (profile.subscribedList.indexOf(type) != -1) {
                    ctx.replyWithMarkdown(`😘親 : You have already subscribe ${userid} ${type}`);
                } else {
                    // Update Subscription List 
                    await opts.cacheHelper.appendCache(type, "DEFAULT", userid);

                    // Update Profile
                    profile.subscribedList.push(type);
                    await opts.userProfileHelper.setProfile(ctx, profile);
                    ctx.replyWithMarkdown(`😘Subscribe ${userid} ${type} done `);
                }

            } else {
                ctx.replyWithMarkdown(`Unknown ${type} Exiting...`);
            }

            app.exitScene(ctx);
        });

        return scene;
    }

    // Un subscriber Scene
    app.getUnSubscribeScene = function () {
        const scene = new Scene('unsubscribe');
        scene.enter(async (ctx) => {
            let profile = await opts.userProfileHelper.getProfile(ctx);
            if (profile.subscribedList == null) {
                ctx.reply('There is nothing subscribed');
                ctx.scene.leave();
                return;
            }

            ctx.reply("Please select to unsubscribe", Markup
                .keyboard(profile.subscribedList)
                .oneTime()
                .resize()
                .extra()
            );
        });
        scene.on('message', async (ctx) => {
            let userid = ctx.message.from.id;
            let type = ctx.message.text;
            let profile = await opts.userProfileHelper.getProfile(ctx);
            if (profile.subscribedList == null) {
                ctx.reply('There is nothing need to unsubscribe');
                ctx.scene.leave();
                return;
            }

            if (profile.subscribedList.indexOf(type) != -1) {
                await opts.cacheHelper.removeCache(type, "DEFAULT", userid);

                // Update User profile
                let profile = await opts.userProfileHelper.getProfile(ctx);
                profile.subscribedList = profile.subscribedList.filter(x => x != type);
                await opts.userProfileHelper.setProfile(ctx, profile);

                ctx.replyWithMarkdown(`😘Unsubscribe ${userid} ${type} done `);

            } else {
                ctx.replyWithMarkdown(`Unknown ${type} Exiting...`);
            }
            app.exitScene(ctx);
        });

        return scene;
    }

    // Get Stock Scene
    app.getStockSubscribeScene = function () {
        const scene = new Scene('stocklist');
        scene.enter((ctx) => ctx.reply("Which stock you wanna subscribe [Full Format please, e.g. 0005]"));
        scene.on('message', async (ctx) => {
            let stock = ctx.message.text;
            let response = await opts.cacheHelper.getCache("STOCK", "SUBSCRIPTION");
            let stockList = (response.data) ? response.data.toString().split(",") : [];
            if (stockList.indexOf(stock) != -1) {
                ctx.replyWithMarkdown(`😘親 : You have already subscribe ${stock}`);
            } else {
                stockList.push(stock);
                let result = await opts.cacheHelper.createCache("STOCK", "SUBSCRIPTION", stockList);
                ctx.replyWithMarkdown(`😘親 : Subscribed ${stock}, total : ${stockList}`);
            }
            app.exitScene(ctx);
        });

        return scene;
    }

    app.exitScene = function (ctx) {
        setTimeout(() => {
            ctx.scene.leave()
        }, 100);
    }

    app.handleRequest = function (ctx) {
        let tmpList = sceneList.map(x => x.id);
        if (ctx.message.entities != null && ctx.message.entities[0].type == "bot_command") {
            if (tmpList.indexOf(ctx.state.command.command) != -1) {
                ctx.scene.enter(ctx.state.command.command);
                return true;
            }
        }
        return false;;
    }

    // Initialize the App
    app.init();
    return app;
}

exports = module.exports = createApplication;