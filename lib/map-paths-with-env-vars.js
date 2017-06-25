'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
var cp = require("child_process");
var dashdash = require('dashdash');
var colors = require('colors/safe');
exports.mapPaths = function (searchRoots, cb) {
    var mappedRoots = searchRoots.map(function (v) {
        return "echo \"" + v + "\";";
    });
    var k = cp.spawn('bash', [], {
        env: Object.assign({}, process.env, {
            NPM_LINK_UP: 'yes'
        })
    });
    k.stdin.write('\n' + mappedRoots.join('\n') + '\n');
    process.nextTick(function () {
        k.stdin.end();
    });
    var data = [];
    k.stdout.setEncoding('utf8');
    k.stderr.setEncoding('utf8');
    k.stderr.pipe(process.stderr);
    k.stdout.on('data', function (d) {
        data.push(d);
    });
    k.once('close', function (code) {
        if (code > 0) {
            return cb({
                code: code
            });
        }
        var pths = data.map(function (d) {
            return String(d).trim();
        }).filter(function (item, index, array) {
            return array.indexOf(item) === index;
        });
        cb(null, pths);
    });
};
