import * as stream from 'stream';
import {logInfo, logError, logWarning, logVeryGood, logGood} from './logging';

/////////////////////////////////////////////////////////////////////

export const stdoutStrm = new stream.Transform({objectMode: true});

stdoutStrm._transform = function (chunk, encoding, done) {
  let data = chunk.toString();
  if (this._lastLineData) data = this._lastLineData + data;

  let lines = data.split('\n');
  this._lastLineData = lines.splice(lines.length - 1, 1)[0];

  lines.forEach(this.push.bind(this));
  done();
};

stdoutStrm._flush = function (done: Function) {
  if (this._lastLineData) this.push(this._lastLineData);
  this._lastLineData = null;
  done();
};

export const stderrStrm = new stream.Transform({objectMode: true});

stderrStrm._transform = function (chunk, encoding, done) {
  let data = chunk.toString();
  if (this._lastLineData) data = this._lastLineData + data;

  let lines = data.split('\n');
  this._lastLineData = lines.splice(lines.length - 1, 1)[0];

  lines.forEach(this.push.bind(this));
  done();
};

stderrStrm._flush = function (done: Function) {
  if (this._lastLineData) this.push(this._lastLineData);
  this._lastLineData = null;
  done();
};


