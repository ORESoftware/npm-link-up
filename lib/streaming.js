'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
var stream = require("stream");
exports.stdoutStrm = new stream.Transform({ objectMode: true });
exports.stdoutStrm._transform = function (chunk, encoding, done) {
    var data = chunk.toString();
    if (this._lastLineData)
        data = this._lastLineData + data;
    var lines = data.split('\n');
    this._lastLineData = lines.splice(lines.length - 1, 1)[0];
    lines.forEach(this.push.bind(this));
    done();
};
exports.stdoutStrm._flush = function (done) {
    if (this._lastLineData)
        this.push(this._lastLineData);
    this._lastLineData = null;
    done();
};
exports.stderrStrm = new stream.Transform({ objectMode: true });
exports.stderrStrm._transform = function (chunk, encoding, done) {
    var data = chunk.toString();
    if (this._lastLineData)
        data = this._lastLineData + data;
    var lines = data.split('\n');
    this._lastLineData = lines.splice(lines.length - 1, 1)[0];
    lines.forEach(this.push.bind(this));
    done();
};
exports.stderrStrm._flush = function (done) {
    if (this._lastLineData)
        this.push(this._lastLineData);
    this._lastLineData = null;
    done();
};
