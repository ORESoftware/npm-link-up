const util = require('util');
const F = require('frankenstop').default;

const NLU = F.bestow(function (obj: Object, isPreValidate: boolean) {
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
          "alwaysRelink":{
            type: 'boolean',
            required: false
          },
          "alwaysReinstall":{
            type: 'boolean',
            required: false
          },
          "linkToItself":{
            type: 'boolean',
            required: false
          },
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
          "comments": {
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
export = NLU;
