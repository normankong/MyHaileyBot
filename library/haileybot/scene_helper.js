'use strict';

const request = require('request');
const util = require('util');
const Stage = require('telegraf/stage')
const Scene = require('telegraf/scenes/base')
const Extra = require('telegraf/extra');
const Markup = require('telegraf/markup');

function createApplication(bot, opts) {
    var bot = bot
    var opts = opts;
    var app = {};
    var SUSBSCRIBE_TYPE_LIST = process.env.SUSBSCRIBE_TYPE_LIST.split(',');

    app.getOpts = function () {
        return opts;
    }

    app.init = function () {}

    app.getSceneList = function () {

        let sceneList = [];
        sceneList.push(app.getSubscribeScene());
        sceneList.push(app.getUnSubscribeScene());

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
        // scene.leave((ctx) => {
        //   ctx.reply('Subscribiption added')
        // });
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

            setTimeout(() => {
                ctx.scene.leave()
            }, 100);

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
        // scene.leave((ctx) => {
        //   ctx.reply('Subscribiption added')
        // });
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
            setTimeout(() => {
                ctx.scene.leave()
            }, 100);
        });

        return scene;
    }

    // Initialize the App
    app.init();
    return app;
}

exports = module.exports = createApplication;