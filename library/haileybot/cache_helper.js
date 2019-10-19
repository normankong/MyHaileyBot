'use strict';

const request = require('request');

const util = require('util')
const requestPromise = util.promisify(request);


function createApplication(bot, opts) {
    var bot = bot
    var opts = opts;
    var app = {};

    app.getOpts = function () {
        return opts;
    }

    app.init = function () {}

    app.getCache = async function (type, key) {
        let param = process.env.CACHE_API_PARAM.replace("{{IDENTIFY}}", process.env.CACHE_JWT_USER).replace("{{TYPE}}", type).replace("{{KEY}}", key)
        let url = process.env.CACHE_API_URL + param;
        let options = {
            headers: {
                "Authorization": process.env.CACHE_JWT_TOKEN
            }
        }
        console.log(`Processing Cache ${url}`)
        const response = await requestPromise(url, options);
        return app.cacheFormatter(response.body);
    }

    app.appendCache = async function (type, key, value) {
        let url = process.env.CACHE_API_URL;
        let headers = {
                "Content-Type" : "application/json",
                'Authorization': process.env.CACHE_JWT_TOKEN
        }
        let body = {
            "identify": process.env.CACHE_JWT_USER,
            "action" : "APPEND",
            "type" : type,
            "key" : key,
            "data" : value
        };

        let request = {
            method: "POST",
            url: url,
            headers: headers,
            json: body
        }

        console.log(`Processing Append Cache ${url} ${key} ${type} ${value}`)
        try
        {
            const response = await requestPromise(request);
            return response.body.code == "000";
        }
        catch (exception){
            return false;
        }
    }

    app.cacheFormatter = function (jsonString) {
        console.log(`Cache result : ${jsonString}`);
        return jsonString;
    }

    // Initialize the App
    app.init();
    return app;
}




exports = module.exports = createApplication;