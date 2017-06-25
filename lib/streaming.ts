import * as stream from 'stream';

export const stdout = new stream.Transform({objectMode: true});

stdout._transform = function (chunk, encoding, done) {
  let data = chunk.toString();
  if (this._lastLineData) data = this._lastLineData + data;

  let lines = data.split('\n');
  this._lastLineData = lines.splice(lines.length - 1, 1)[0];

  lines.forEach(this.push.bind(this));
  done();
};

stdout._flush = function (done: Function) {
  if (this._lastLineData) this.push(this._lastLineData);
  this._lastLineData = null;
  done();
};

export const stderr = new stream.Transform({objectMode: true});

stderr._transform = function (chunk, encoding, done) {
  let data = chunk.toString();
  if (this._lastLineData) data = this._lastLineData + data;

  let lines = data.split('\n');
  this._lastLineData = lines.splice(lines.length - 1, 1)[0];

  lines.forEach(this.push.bind(this));
  done();
};

stderr._flush = function (done: Function) {
  if (this._lastLineData) this.push(this._lastLineData);
  this._lastLineData = null;
  done();
};


