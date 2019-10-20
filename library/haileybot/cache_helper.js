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

    app.getCache = async function (type, key, formatter) {
        // User Default formatter if not pass
        formatter = formatter != null ? formatter : app.jsonFormatter;

        let param = process.env.CACHE_API_PARAM.replace("{{IDENTIFY}}", process.env.CACHE_JWT_USER).replace("{{TYPE}}", type).replace("{{KEY}}", key)
        let url = process.env.CACHE_API_URL + param;
        let options = {
            headers: {
                "Authorization": process.env.CACHE_JWT_TOKEN
            }
        }
        console.log(`Processing Cache ${url}`)
        const response = await requestPromise(url, options);
        return formatter(response.body);
    }

    app.procedCacheUpdate = async function (action, type, key, value) {
        let url = process.env.CACHE_API_URL;
        let headers = {
                "Content-Type" : "application/json",
                'Authorization': process.env.CACHE_JWT_TOKEN
        }
        let body = {
            "identify": process.env.CACHE_JWT_USER,
            "action" : action,
            "type" : type,
            "key" : key
        };
        if (action != "DELETE") body.data = value;

        let request = {
            method: "POST",
            url: url,
            headers: headers,
            json: body
        }

        console.log(`Processing Cache ${url} ${action} ${key} ${type} ${value}`)
        try
        {
            const response = await requestPromise(request);
            return response.body.code == "000";
        }
        catch (exception){
            return false;
        }
    }

    app.plainFormatter = function (jsonString) {
        console.log(`Cache result : ${jsonString}`);
        return jsonString;
    }

    app.createCache = async function (type, key, value) {
        return await app.procedCacheUpdate ("CREATE", type, key, value);
    }

    app.appendCache = async function (type, key, value) {
        return await app.procedCacheUpdate ("APPEND", type, key, value);
    }

    app.deleteCache = async function (type, key) {
        return await app.procedCacheUpdate ("DELETE", type, key);
    }

    app.removeCache = async function (type, key, value) {
        return await app.procedCacheUpdate ("REMOVE", type, key, value);
    }

    app.emptyListFormatter = function(response){
        let json = JSON.parse(response);
        return (json.code == "000") ? json.data.toString().split(',') : [];
    }

    app.nullFormatter = function(response){
        let json = JSON.parse(response);
        return (json.code == "000") ? json.data : null;
    }

    app.blankFormatter = function(response){
        let json = JSON.parse(response);
        return (json.code == "000") ? json.data : "";
    }

    app.jsonFormatter = function (jsonString) {
        return JSON.parse(jsonString);
    }

    // Initialize the App
    app.init();
    return app;
}

exports = module.exports = createApplication;