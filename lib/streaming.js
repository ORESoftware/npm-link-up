"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var stream = require("stream");
exports.stdout = new stream.Transform({ objectMode: true });
exports.stdout._transform = function (chunk, encoding, done) {
    var data = chunk.toString();
    if (this._lastLineData)
        data = this._lastLineData + data;
    var lines = data.split('\n');
    this._lastLineData = lines.splice(lines.length - 1, 1)[0];
    lines.forEach(this.push.bind(this));
    done();
};
exports.stdout._flush = function (done) {
    if (this._lastLineData)
        this.push(this._lastLineData);
    this._lastLineData = null;
    done();
};
exports.stderr = new stream.Transform({ objectMode: true });
exports.stderr._transform = function (chunk, encoding, done) {
    var data = chunk.toString();
    if (this._lastLineData)
        data = this._lastLineData + data;
    var lines = data.split('\n');
    this._lastLineData = lines.splice(lines.length - 1, 1)[0];
    lines.forEach(this.push.bind(this));
    done();
};
exports.stderr._flush = function (done) {
    if (this._lastLineData)
        this.push(this._lastLineData);
    this._lastLineData = null;
    done();
};
