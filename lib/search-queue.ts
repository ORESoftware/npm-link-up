import async = require( 'async');

export const q = async.queue(function (task: Function, cb: Function) {
  task(cb);
}, 2);
