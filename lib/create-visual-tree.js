'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
var util = require("util");
var logging_1 = require("./logging");
exports.createTree = function (map, name, originalList) {
    var tree = (_a = {},
        _a[name] = {},
        _a);
    var createItem = function (key, obj, keys) {
        obj[key] = obj[key] || {};
        if (!(map[key] && Array.isArray(map[key].deps))) {
            logging_1.log.warning("no key named \"" + key + "\" in map, or deps is not an array => " + util.inspect(map[key]));
            return;
        }
        map[key].deps.forEach(function (d) {
            if (key !== d && keys.indexOf(d) < 0) {
                keys.push(d);
                var v2 = obj[key][d] = {};
                createItem(d, v2, keys.slice(0));
            }
            else {
                keys.push(d);
                obj[key][d] = null;
            }
        });
    };
    originalList.forEach(function (k) {
        createItem(k, tree[name], [name]);
    });
    var cleanTree = function (k, val) {
        delete val[k];
        Object.keys(val).forEach(function (key) {
            cleanTree(key, val[key]);
        });
    };
    cleanTree(name, tree[name]);
    return tree;
    var _a;
};
