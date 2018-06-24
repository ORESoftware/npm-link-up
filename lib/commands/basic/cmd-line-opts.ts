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
    help: 'Verbosity level is an integer between 1 and 3, inclusive.',
    default: 2
  },

  {
    names: ['force'],
    type: 'bool',
    help: 'Force execution at hand.',
    default: false
  },

  {
    names: ['bash-completion','completion'],
    type: 'bool',
    help: 'Generate bash-completion code.',
    hidden: true
  },

  {
    names: ['npm-shell-version', 'use-shell-version', 'shell-version'],
    type: 'bool',
    help: 'Use the NPM version that is active in the shell.',
    default: false
  }

];
