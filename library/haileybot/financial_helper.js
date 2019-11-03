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
        var stockRegEx = new RegExp("(\\d*).hk$", "i");
        if (stockRegEx.test(subject)) {
            //var msg = stockRegEx.exec(subject);
            var stockQuote = subject.padStart(7, '0');

            ctx.reply(`😅Just a moment please, fetching ${stockQuote} ...`)
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
                ctx.reply(`😅Just a moment please, fetching Stock ...`)
                app.proceedScheduleStock(ctx);
                return true;
            case "FX":
                ctx.reply(`😅Just a moment please, fetching FX ...`)
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
    app.proceedStockQuote = async function (ctx, stockQuote, callback) {
        let url = process.env.STOCK_API_URL.replace("<%STOCK_QUOTE%>", leftPad(stockQuote, 5, "0"));
        console.log(`Processing url : ${url}`);

        let formatter = function (body) {
            let json = JSON.parse(body)["Global Quote"];
            if (json == null) return { displayText : json['Note']};
            let result = {
                symbol: json["01. symbol"],
                open: json["02. open"],
                high: json["03. high"],
                low: json["04. low"],
                price: json["05. price"],
                volumne: json["06. volume"],
                date: json["07. latest trading day"],
                close: json["08. previous close"],
                change: json["09. change"],
                changeRate: json["10. change percent"],
            };
            result.displayText = `${result.symbol} : ${result.price}/${result.close} ${result.change}(${result.changeRate})`;
            return result;
        }

        let myCallback = function (result) {
            if (callback) {
                callback(result);
            } else {
                console.log(`[${result.displayText}]`)
                app.replyMarkdown(ctx, result.displayText);
            }
        }

        // Trigger Get Request
        app.getRequest(url, null, formatter, myCallback);
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
        buffer += "|-----------|-------------------\n";
        buffer += "| Quote     | Price             \n";
        buffer += "|-----------|-------------------\n";

        for (let i = 0; i < resultList.length; i++) {
            let stock = resultList[i];
            buffer += `| ${stock.symbol}   |  ${leftPad(stock.price.toString(), 5, " ")}\n`;
        }
        buffer += "|-----------|-------------------\n";

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
        url = url.replace("{{FROM}}", fxQuote.from);
        url = url.replace("{{TO}}", fxQuote.to);

        let formatter = function (body) {
            let json = JSON.parse(body)["Realtime Currency Exchange Rate"];
            if (json == null) return { displayText : json['Note']};
            let result = {
                fromCcyCode: json["1. From_Currency Code"],
                fromCcyName: json["2. From_Currency Name"],
                toCcyCode: json["3. To_Currency Code"],
                toCcyName: json["4. To_Currency Name"],
                rate: json["5. Exchange Rate"],
                time: json["6. Last Refreshed"],
                zone: json["7. Time Zone"],
                bid: json["8. Bid Price"],
                ask: json["9. Ask Price"]
            };
            result.displayText = `${result.fromCcyCode}${result.toCcyCode} (Bid : ${result.bid} Ask : ${result.ask}) ${result.time}`;
            return result;
        }

        let myCallback = function (result) {
            if (callback) {
                callback(result);
            } else {
                console.log(`[${result.displayText}]`)
                app.replyMarkdown(ctx, result.displayText);
            }
        }

        // Trigger Get Request
        app.getRequest(url, null, formatter, myCallback);
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
        buffer += "|----------|------------|\n";
        buffer += "| FX Pair  | Rate       |\n";
        buffer += "|----------|------------|\n";

        for (let i = 0; i < resultList.length; i++) {
            let fx = resultList[i];
            buffer += `| ${fx.fromCcyCode}${fx.toCcyCode}   | ${(fx.rate).toString().padStart(8)} |\n`;
        }
        buffer += "|----------|------------|";

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

    app.getRequest = function (url, options, formatter, callback) {
        request.get(url, options,
            function (error, response, body) {
                var result = (error) ? { 'Note' : error} : formatter(body);
                callback(result, error, response, body);
            }
        );
    }

    app.stockName = function (symbol) {
        return `Name : ${symbol}`;
    }

    // Initialize the App
    app.init();
    return app;
}



exports = module.exports = createApplication;