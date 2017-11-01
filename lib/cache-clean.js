'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
var cp = require("child_process");
var logging_1 = require("./logging");
exports.cleanCache = function (cb) {
    var k = cp.spawn('bash', [], {
        env: Object.assign({}, process.env, {
            NPM_LINK_UP: 'yes'
        })
    });
    k.stdin.write('\n' + 'npm cache clean; yarn cache clean;' + '\n');
    process.nextTick(function () {
        k.stdin.end();
    });
    k.stdout.setEncoding('utf8');
    k.stderr.setEncoding('utf8');
    k.stderr.pipe(process.stderr);
    k.once('error', function (e) {
        logging_1.log.error('npm cache clean/yarn cache clean experience spawn error =>\n', e.stack || e);
    });
    k.once('exit', function (code) {
        code > 0 ? cb({ path: 'npm cache clean', code: code }) : cb();
    });
};
