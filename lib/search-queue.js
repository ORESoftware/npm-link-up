"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var async = require("async");
exports.q = async.queue(function (task, cb) {
    task(cb);
}, 2);
