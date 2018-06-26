'use strict';


export default  [

  {
    names: ['help', 'h'],
    type: 'bool',
    help: 'Print help info for `nlu init`, and exit 0.'
  },
  {
    names: ['interactive'],
    type: 'bool',
    help: 'Use an interactive mode.',
    default: false
  },
  {
    names: ['verbosity', 'v'],
    type: 'positiveInteger',
    help: 'Verbosity level is an integer between 1 and 4, inclusive.',
    default: 3
  },
  {
    names: ['search-root','search'],
    type: 'arrayOfString',
    help: 'Search roots to search for other NPM projects.',
  },
  {
    names: ['search-from-home'],
    type: 'bool',
    help: 'Make $HOME your search root.',
    default: false
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
