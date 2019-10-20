'use strict';

const request = require('request');
const leftPad = require("left-pad");

function createApplication(bot, opts) {
    var bot = bot
    var opts = opts;
    var app = {};

    app.getOpts = function () {
        return opts;
    }

    app.init = function () {}

    app.handleRequest = function (ctx) {
        return false;
    }

    app.handleScheduler = function (query) {
        return false;
    }

    // Initialize the App
    app.init();
    return app;
}

exports = module.exports = createApplication;