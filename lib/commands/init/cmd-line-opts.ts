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
    help: 'Verbosity level is an integer between 1 and 3, inclusive.',
    default: 2
  },
  {
    names: ['search-root','search'],
    type: 'arrayOfString',
    help: 'Search roots to search for other NPM projects.',
  },
  {
    names: ['force'],
    type: 'bool',
    help: 'Force execution at hand.',
    default: false
  },
  {
    names: ['npm-shell-version', 'use-shell-version', 'shell-version'],
    type: 'bool',
    help: 'Use the NPM version that is active in the shell.',
    default: false
  }

];
