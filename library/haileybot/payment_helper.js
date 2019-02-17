'use strict';

const request = require('request');
const leftPad = require("left-pad");

function createApplication(opts) {
    var opts = opts;
    var app = {};

    app.getOpts = function () {
        return opts;
    }

    app.init = function () {}

    app.handleRequest = function (ctx) {
        return false;
    }

    // Initialize the App
    app.init();
    return app;
}




exports = module.exports = createApplication;