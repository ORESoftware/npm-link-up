'use strict';


export default [

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
  },

  {
    names: ['dry-run','dry'],
    type: 'bool',
    help: 'Simulates the run and provides a visual tree report - does zero writes, just does reads.',
    default: false
  },

  {
    names: ['search-from-home'],
    type: 'bool',
    help: 'Make $HOME your search root; this will override any other search roots.',
    default: false
  },

  {
    names: ['no-use-local','no-local'],
    type: 'bool',
    help: 'Do not add local node_modules/.bin to the $PATH.',
    default: false
  },

];
