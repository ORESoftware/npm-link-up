"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var logging_1 = require("./logging");
exports.createTree = function (map, name, originalList) {
    var tree = (_a = {},
        _a[name] = {},
        _a);
    var createItem = function (key, obj, keys) {
        obj[key] = {};
        if (map[key]) {
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
        }
        else {
            logging_1.logWarning("no key named \"" + key + "\" in map.");
        }
    };
    originalList.forEach(function (k) {
        createItem(k, tree[name], [name]);
    });
    return tree;
    var _a;
};
