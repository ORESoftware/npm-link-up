'use strict';

export default [

  {
    names: ['version', 'vn'],
    type: 'bool',
    help: 'Print the npm-link-up version, and exit 0.'
  },

  {
    names: ['help', 'h'],
    type: 'bool',
    help: 'Print help menu for npm-link-up, and exit 0.'
  },

  {
    names: ['verbosity', 'v'],
    type: 'positiveInteger',
    help: 'Verbosity level is an integer between 1 and 4, inclusive.',
    default: 3
  },

  {
    names: ['force'],
    type: 'bool',
    help: 'Force execution at hand.',
    default: false
  },

  {
    names: ['global','g'],
    type: 'bool',
    help: 'Tells NLU to make changes to global config, not the local config.',
    default: false
  },

  {
    names: ['json'],
    type: 'bool',
    help: 'Use JSON for command line output.',
    default: false
  },

  {
    names: ['debug', 'd'],
    type: 'bool',
    help: 'Show debug logging.',
    default: false,
    hidden: true
  },

  {
    names: ['allow-unknown'],
    type: 'bool',
    help: 'Allow unknown/unrecognized options at the command line.',
    default: false,
    hidden: true
  }

];
