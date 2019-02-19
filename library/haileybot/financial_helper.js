'use strict';

const request = require('request');
const leftPad = require("left-pad");

function createApplication(bot, opts) {
    var bot = bot;
    var opts = opts;
    var app = {};

    app.getOpts = function () {
        return opts;
    }

    app.init = function () {}

    app.handleRequest = function (ctx) {
        // Proceed Stock Quote
        var stockRegEx = new RegExp("(\\d*).hk", "i");
        if (!stockRegEx.test(ctx.message.text)) return false; {
            var msg = stockRegEx.exec(ctx.message.text);
            var stockQuote = msg[1];

            ctx.reply(`Just a moment please, fetching ${stockQuote}...`)
            setTimeout(app.proceedStockQuote, 100, ctx, stockQuote);
            return true;
        }
    }

    /**
     * Proceed Stock Quote
     * @param {Telegram Context} ctx 
     * @param {Stock Tick} stockQuote 
     */
    app.proceedStockQuote = function (ctx, stockQuote) {
        let url = process.env.STOCK_API_URL.replace("<%STOCK_QUOTE%>", leftPad(stockQuote, 5, "0"));
        console.log(`Processing url : ${url}`);
        request.get(url,
            function (error, response, body) {
                let price = JSON.parse(body).dataset.data[0][1];
                let symbol = JSON.parse(body).dataset.name;
                return ctx.reply(`${ symbol } : $${ price }`);
            }
        )
    }

    // Initialize the App
    app.init();
    return app;
}


exports = module.exports = createApplication;