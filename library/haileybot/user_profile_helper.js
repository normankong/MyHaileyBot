'use strict';

function createApplication(bot, opts) {
    var bot = bot
    var opts = opts;
    var app = {};

    app.getOpts = function () {
        return opts;
    }

    app.init = function () {
    }

    app.getProfile = async function (ctx) {
        
        if (ctx.session.profile != null) {
            console.log(`Profile in session : ${JSON.stringify(ctx.session.profile)}`);
            return ctx.session.profile;
        }

        let userid = ctx.message.from.id;
        let result = await opts.cacheHelper.getCache("USER", userid);
        if (result.code != "000") {
            return null;
        }
        let profile = result.data;
        ctx.session.profile = profile;
        return profile;
    }

    app.setProfile = async function (ctx, profile) {
        ctx.session.profile = profile;
        let userid = ctx.message.from.id;
        let result = await opts.cacheHelper.createCache("USER", userid, JSON.stringify(profile));
        return result;
    }

    app.initProfile = async function (ctx) {
        let profile = await app.getProfile(ctx);
        if (profile != null) {
            console.log(`Profile exist : ${JSON.stringify(profile)}`);
            return true;
        } else {
            let profile = {
                first_name: ctx.message.from.first_name,
                username: ctx.message.from.username
            }

            // Update to DB
            let result = await app.setProfile(ctx, profile);
            console.log(`Profile created ${JSON.stringify(profile)}`);
            return result;
        }
    }

    // Initialize the App
    app.init();
    return app;
}

exports = module.exports = createApplication;