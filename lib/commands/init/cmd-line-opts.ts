'use strict';


export default  [

  {
    names: ['help', 'h'],
    type: 'bool',
    help: 'Print help info for `nlu init`, and exit 0.'
  },

  {
    names: ['verbosity', 'v'],
    type: 'positiveInteger',
    help: 'Verbosity level is an integer between 1 and 4, inclusive.',
    default: 2
  },

  {
    names: ['force'],
    type: 'bool',
    help: 'Force execution at hand.',
    default: false
  },

  {
    names: ['no-use-local','no-local'],
    type: 'bool',
    help: 'Do not add local node_modules/.bin to the $PATH.',
    default: false
  },

];
