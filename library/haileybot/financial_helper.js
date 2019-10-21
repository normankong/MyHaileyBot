'use strict';

const request = require('request');
const leftPad = require("left-pad");
const STOCK_SCHEDULER_ID = process.env.STOCK_SCHEDULER_ID;
const FX_SCHEDULER_ID = process.env.FX_SCHEDULER_ID;

function createApplication(bot, opts) {
    var bot = bot;
    var opts = opts;
    var app = {};
    var fxList = [];

    app.getOpts = function () {
        return opts;
    }

    app.init = function () {
        // The Cache Helper only available upon delay
        setTimeout(async () => {
            fxList = await opts.cacheHelper.getCache("FX", "SUBSCRIPTION", app.fxCacheFormatter);
        }, 100);
    }

    app.handleScheduler = function (query) {
        if (query.id == STOCK_SCHEDULER_ID) {
            console.log("Executing Finance Helper Stock scheduler jobs");
            app.proceedScheduleStock();
            return true;
        }
        if (query.id == FX_SCHEDULER_ID) {
            console.log("Executing Finance Helper FX scheduler jobs");
            app.proceedScheduleFxRate();
            return true;
        }

        return false;
    }

    app.handleRequest = function (ctx) {

        let subject = ctx.message.text;
        if (subject == null) return false;

        // Proceed Stock Quote
        var stockRegEx = new RegExp("(\\d*).hk", "i");
        if (stockRegEx.test(subject)) {
            var msg = stockRegEx.exec(subject);
            var stockQuote = msg[1];

            ctx.reply(`😅Just a moment please, fetching ${stockQuote}.hk ...`)
            setTimeout(app.proceedStockQuote, 100, ctx, stockQuote);
            return true;
        }

        // Handle FX Rate
        for (let i = 0; i < fxList.length; i++) {
            let fx = fxList[i];
            if (subject == fx.from) {
                app.proceedFxRateQuote(ctx, fx);
                return true;
            }
        }

        switch (subject.toUpperCase()) {
            case "STOCK":
                app.proceedScheduleStock(ctx);
                return true;
            case "FX":
                app.proceedScheduleFxRate(ctx);
                return true;
        }

        return false;
    }

    /**
     * Proceed Stock Quote
     * @param {Telegram Context} ctx 
     * @param {Stock Tick} stockQuote 
     */
    app.proceedStockQuote = function (ctx, stockQuote, callback) {
        let url = process.env.STOCK_API_URL.replace("<%STOCK_QUOTE%>", leftPad(stockQuote, 5, "0"));
        console.log(`Processing url : ${url}`);
        request.get(url,
            function (error, response, body) {

                let price = JSON.parse(body).dataset.data[0][1];
                let symbol = JSON.parse(body).dataset.name;
                if (callback) {
                    callback({
                        code: stockQuote,
                        symbol: symbol,
                        price: price
                    });
                } else {
                    app.replyMarkdown(ctx, `${ symbol } : $${ price }`);
                }
            }
        )
    }

    app.proceedScheduleStock = async function (ctx, inStockList, resultList) {
        // Retrieve the Stock List from Cache
        if (inStockList == null) {
            inStockList = await opts.cacheHelper.getCache("STOCK", "SUBSCRIPTION", opts.cacheHelper.emptyListFormatter);
            console.log(`Stock List : ${inStockList}`);
        }
        if (resultList == null) resultList = [];

        // Check finish stock quote
        if (inStockList.length != 0) {
            let stock = inStockList.shift();

            // Trigger Proceed Stock Quote with callback
            app.proceedStockQuote(null, stock, (result) => {
                // result.desc = stock.desc
                resultList.push(result);
                app.proceedScheduleStock(ctx, inStockList, resultList);
            });
            return;
        }

        // Format and display stock quote result
        let buffer = "";
        buffer += "|--------|--------|--------------\n";
        buffer += "| Quote  | Price  | Name         \n";
        buffer += "|--------|--------|--------------\n";

        for (let i = 0; i < resultList.length; i++) {
            let stock = resultList[i];
            buffer += `| ${leftPad(stock.code, 5, "0")}  |  ${leftPad(stock.price.toString(), 5, " ")} | ${stock.symbol}\n`;
        }
        buffer += "|--------|--------|--------------\n";

        if (ctx != null) {
            app.replyMarkdown(ctx, buffer);
        } else {
            // Get the Latest subscriber list
            let subscriberList = await app.getSubscriberList(STOCK_SCHEDULER_ID);
            console.log(`Subscriber : ${subscriberList}`);
            opts.myBot.sendMarkdown(subscriberList, buffer);
        }
    }

    /**
     * Proceed FX Rate Quote
     * @param {Telegram Context} ctx 
     * @param {Fx Rate} fxQuote 
     */
    app.proceedFxRateQuote = function (ctx, fxQuote, callback) {
        let url = process.env.FX_API_URL;
        url = url.replace("{{QUOTATION}}", fxQuote.q);
        url = url.replace("{{FROM}}", fxQuote.from);
        url = url.replace("{{TO}}", fxQuote.to);

        let options = {
            headers: {
                "x-rapidapi-key": process.env.FX_API_KEY_VALUE,
                "x-rapidapi-host": process.env.FX_API_HOST_VALUE
            }
        }
        console.log(`Processing url : ${url}`);
        request.get(url, options,
            function (error, response, body) {
                if (callback) {
                    fxQuote.rate = body;
                    callback(fxQuote);
                } else {
                    app.replyMarkdown(ctx, `${fxQuote.from}-${fxQuote.to} : $${ body }`);
                }
            }
        )
    }

    app.proceedScheduleFxRate = async function (ctx, inFxList, resultList) {
        // Retrieve the FX List from Cache
        if (inFxList == null) {
            inFxList = await opts.cacheHelper.getCache("FX", "SUBSCRIPTION", app.fxCacheFormatter);
            fxList = inFxList.slice(0);
        }
        if (resultList == null) resultList = [];

        // Check finish fx rate quote
        if (inFxList.length != 0) {
            let fx = inFxList.shift();

            // Trigger Proceed Stock Quote with callback
            app.proceedFxRateQuote(null, fx, (result) => {
                resultList.push(result);
                app.proceedScheduleFxRate(ctx, inFxList, resultList);
            });
            return;
        }

        // Format and display result
        let buffer = "";
        buffer += "|---------|----------|\n";
        buffer += "| FX Pair | Rate     |\n";
        buffer += "|---------|----------|\n";

        for (let i = 0; i < resultList.length; i++) {
            let fx = resultList[i];
            buffer += `| ${fx.from}-${fx.to} | ${(fx.rate).toString().padStart(8)} |\n`;
        }
        buffer += "|---------|----------|";


        if (ctx != null) {
            app.replyMarkdown(ctx, buffer);
        } else {
            // Get the Latest subscriber list
            let subscriberList = await app.getSubscriberList(FX_SCHEDULER_ID);
            console.log(`Subscriber : ${subscriberList}`);
            opts.myBot.sendMarkdown(subscriberList, buffer);
        }
    }

    app.replyMarkdown = function (ctx, message) {
        ctx.reply(`\`\`\`\n${message}\`\`\``, {
            parse_mode: "Markdown"
        });
    }

    app.getSubscriberList = async function (type) {
        let list = await opts.cacheHelper.getCache(type, "DEFAULT", opts.cacheHelper.emptyListFormatter);
        return list;
    }

    // Special Cache Formatter (Manual data maintenance)
    app.fxCacheFormatter = async function (response) {
        let data = JSON.parse(response)
        if (data.code == "000") return data.data;
        return [];
    }

    // Initialize the App
    app.init();
    return app;
}


exports = module.exports = createApplication;