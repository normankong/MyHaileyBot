'use strict';

const https = require("https");

function createApplication(opts) {
    var opts = opts;
    var app = {};

    app.getOpts = function () {
        return opts;
    }

    app.init = function () {}

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
        var fileID;
        for (var i = 0; i < ctx.message.photo.length; i++) {
            var photo = ctx.message.photo[i];
            var width = photo.width;
            var height = photo.height;
            fileID = photo.file_id;
            if (width >= 400) {
                break;
            }
        }

        if (fileID != null) {
            var handler = ctx.telegram.getFile(fileID);
            handler.then(function (v) {
                var url = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${v.file_path}`;
                app.proceedDownloadAndPredict(ctx, url)
            });
        } else {
            ctx.reply("File is somehow error");
        }
    }
    /**
     * Download user upload file then submit to Google Vision
     * @param {URL for the image} url 
     * @param {Telegram Context} ctx 
     */
    app.proceedDownloadAndPredict = function(ctx, url) {
        var buffer = Buffer.alloc(0);
        console.log(`Download from ${url}`);
        // var file = fs.createWriteStream(dest);
        var request = https.get(url, function (response) {
            response.on('end', () => {
                console.log(`Download completed ${buffer.length}`);
                // vision.predict(buffer, function (result) {
                //     ctx.reply(result);
                // });
                ctx.reply("Got your vision request, will be implement later");
            });
            response.on('data', (d) => {
                // console.log(d, d.length)
                buffer = Buffer.concat([buffer, Buffer.from(d, "binary")]);
            });
        }).on('error', function (err) { // Handle errors
            console.log(err)
        });
    };


    // Initialize the App
    app.init();
    return app;
}

exports = module.exports = createApplication;