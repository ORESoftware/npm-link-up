const util = require('util');
const F = require('frankenstop');

const NLU = F.bestow(function (obj, isPreValidate) {
  this.config = obj;
  F.call(this, isPreValidate);
});

NLU.getSchema = function () {

  return Object.freeze({

    prevalidateAllFields: true,
    allowExtraneousProperties: false,

    properties: {

      config: {
        type: 'object',
        required: true,
        properties: {
          "searchRoots": {
            type: 'array',
            required: false,
            elements: {
              type: 'string'
            }
          },
          "ignore": {
            type: 'array',
            required: false,
            elements: {
              type: 'string'
            }
          },
          "list": {
            type: 'array',
            required: true,
            elements: {
              type: 'string'
            }
          }

        }
      },

    }
  })

};

NLU.prototype.toJSON = function toJSON() {
  return JSON.stringify(this.config);
};

F.validateFrankenstopSchema(NLU);
module.exports = NLU;