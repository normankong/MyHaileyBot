'use strict';

const request = require('request');
const util = require('util')
var cacheHelper = require("./cache_helper.js");

const SCHEDULER_ID = process.env.WEATHER_SCHEDULER_ID;

const requestPromise = util.promisify(request);

function createApplication(bot, opts) {
    var bot = bot;
    var opts = opts;
    var app = {};
    let iconTable = {
        "01d": "wi-day-sunny",
        "02d": "wi-day-cloudy",
        "03d": "wi-cloudy",
        "04d": "wi-cloudy-windy",
        "09d": "wi-showers",
        "10d": "wi-rain",
        "11d": "wi-thunderstorm",
        "13d": "wi-snow",
        "50d": "wi-fog",
        "01n": "wi-night-clear",
        "02n": "wi-night-cloudy",
        "03n": "wi-night-cloudy",
        "04n": "wi-night-cloudy",
        "09n": "wi-night-showers",
        "10n": "wi-night-rain",
        "11n": "wi-night-thunderstorm",
        "13n": "wi-night-snow",
        "50n": "wi-night-alt-cloudy-windy"
    }

    let hkIconTable = {
        "50": "陽光充沛",
        "51": "間有陽光",
        "52": "短暫陽光",
        "53": "間有陽光幾陣驟雨",
        "54": "短暫陽光有驟雨",
        "60": "多雲",
        "61": "密雲",
        "62": "微雨",
        "63": "雨",
        "64": "大雨",
        "65": "雷暴",
        "70": "天色良好",
        "71": "天色良好",
        "72": "天色良好",
        "73": "天色良好",
        "74": "天色良好",
        "75": "天色良好",
        "76": "大致多雲",
        "77": "天色大致良好",
        "80": "大風",
        "81": "乾燥",
        "82": "潮濕",
        "83": "霧",
        "84": "薄霧",
        "85": "煙霞",
        "90": "熱",
        "91": "暖",
        "92": "涼",
        "93": "冷"
    }

    let zoneList = process.env.WEATHER_ZONE_LIST.split(",");

    app.getOpts = function () {
        return opts;
    }

    app.init = function () {
        cacheHelper = cacheHelper();
    }

    app.handleScheduler = function (query) {

        if (query.id == SCHEDULER_ID) {
            console.log("Executing Weather Helper scheduler jobs");
            app.proceedWeatherRequest();
            return true;
        }
        return false;
    }

    app.handleRequest = function (ctx) {

        let subject = ctx.message.text;
        if (subject == null) return false;

        if (subject.toUpperCase() == "WEATHER") {
            app.proceedWeatherQuote(ctx)
            return true;
        }

        return false;
    }

    /**
     * Proceed Weather Quote
     * @param {Telegram Context} ctx 
     * @param {Stock Tick} stockQuote 
     */
    app.proceedWeatherQuote = async function (ctx, callback) {

        let currWeather = await app.getURL("https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=rhrread&lang=tc", app.currentFormatter);
        let forecastWeather = await app.getURL("https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=fnd&lang=tc", app.forecastFormatter);

        if (callback) {
            callback(currWeather, forecastWeather);
        } else {
            app.replyMarkdown(ctx, currWeather);
            app.replyMarkdown(ctx, forecastWeather);
            ctx.reply("😘亲 : 按這裹來看詳情 : https://my.hko.gov.hk/myindex.htm", {
                disable_web_page_preview: "true"
            });
        }

        // let url = process.env.WEATHER_CURRENT_API_URL;
        // url = url.replace("{{CITY_ID}}", process.env.WEATHER_CITY_ID);
        // url = url.replace("{{API_KEY}}", process.env.WEATHER_API_KEY);

        // console.log(`Processing url : ${url}`);
        // request.get(url,
        //     function (error, response, body) {
        //         let weather = app.parseWeather(body);

        //         if (callback) {
        //             callback(currWeather, forecastWeather);
        //         } else {
        //             ctx.reply(currWeather);
        //             ctx.reply(forecastWeather)
        //         }
        //     }
        // )
    }

    app.proceedWeatherRequest = function () {

        app.proceedWeatherQuote(null, async (currWeather, forecastWeather) => {
            // Get the Latest subscriber list
            let subscriberList = await app.getSubscriberList(SCHEDULER_ID);
            console.log(`Subscriber : ${subscriberList}`);

            opts.myBot.sendMarkdown(subscriberList, currWeather);
            opts.myBot.sendMarkdown(subscriberList, forecastWeather);
        });
    }

    app.parseWeather = function (json) {
        let data = JSON.parse(json);

        let result = {
            raw: data
        }
        result.weatherType = iconTable[data.weather[0].icon];
        result.humidity = parseFloat(data.main.humidity);
        result.temp = app.convertTemp(data.main.temp);
        result.temp_min = app.convertTemp(data.main.temp_min);
        result.temp_max = app.convertTemp(data.main.temp_max);
        result.name = data.name;

        return result;
    }

    app.convertTemp = function (temperature) {
        return (parseFloat(temperature) - 273.15).toFixed(1);
    }

    app.getURL = async function (url, formatter) {
        console.log(`Processing Weather ${url}`)
        const response = await requestPromise(url);
        return formatter(response.body);
    }

    app.forecastFormatter = function (jsonString) {
        let json = JSON.parse(jsonString)
        let buffer = "";
        for (var i = 0; i < 5; i++) {
            let tmp = json.weatherForecast[i];
            buffer += `${tmp.week} ${tmp.forecastMaxtemp.value}-${tmp.forecastMintemp.value}°C ${hkIconTable[tmp.ForecastIcon]}\n`;
        }

        buffer += json.generalSituation;

        return `😇天氣預測：\n${buffer}`;
    }

    app.currentFormatter = function (jsonString) {
        let json = JSON.parse(jsonString)
        let bufferList = [];
        let resultList = [];

        // Prepare Temperature Hash
        for (var i = 0; i < json.temperature.data.length; i++) {
            let tmp = json.temperature.data[i];
            let tmpZone = tmp.place.substring(0, 2);
            if (zoneList.indexOf(tmpZone) != -1) {
                bufferList[tmpZone] = `${tmpZone} ${tmp.value}°C`;
            }
        }

        // 'Inner Join' Rainfall information
        for (var i = 0; i < json.rainfall.data.length; i++) {
            let tmp = json.rainfall.data[i];
            if (bufferList[tmp.place] != null) {
                resultList.push(`${bufferList[tmp.place]} 降雨${tmp.max}${tmp.unit}`);
            }
        }

        return `😘各區天氣：\n${resultList.join("\n")}`;
    }

    app.replyMarkdown = function (ctx, message) {
        ctx.reply(`\`\`\`\n${message}\`\`\``, {
            parse_mode: "Markdown"
        });
    }

    app.getSubscriberList = async function (type) {
        let cacheResult = await cacheHelper.getCache(type, "DEFAULT");
        let subscriber = cacheResult.data;
        if (subscriber == null) {
            console.log("No one subscribe");
            return [];
        }
        return subscriber.toString().split(',');
    }

    // Initialize the App
    app.init();
    return app;
}


exports = module.exports = createApplication;