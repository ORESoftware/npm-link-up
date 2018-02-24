"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCleanMap = function (rootPackageName, map) {
    var newMap = {};
    var getRelevantItems = function (v) {
        if (map[v] && !newMap[v]) {
            newMap[v] = map[v];
            var list = map[v].deps;
            if (!Array.isArray(list)) {
                throw new Error('list should be an array, but is not a array type: ' + JSON.stringify(map[v]));
            }
            list.forEach(function (l) {
                getRelevantItems(l);
            });
        }
    };
    getRelevantItems(rootPackageName);
    return newMap;
};
