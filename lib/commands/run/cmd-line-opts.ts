'use strict';

export default  [

  {
    names: ['help', 'h'],
    type: 'bool',
    help: 'Print help menu for `nlu run`, and exit 0.'
  },

  {
    names: ['verbosity', 'v'],
    type: 'positiveInteger',
    help: 'Verbosity level is an integer between 1 and 4, inclusive.',
    default: 2
  },

  {
    names: ['treeify'],
    type: 'bool',
    help: 'Log a tree representation of your project\'s npm-link-up dependencies and exit. This is cool.',
  },

  {
    names: ['dry-run','dry'],
    type: 'bool',
    help: 'Simulates the run and provides a visual tree report - does zero writes, just does reads.',
    default: false
  },

  {
    names: ['force'],
    type: 'bool',
    help: 'Force execution at hand.',
    default: false
  },

  {
    names: ['install-all'],
    type: 'bool',
    help: 'This option will tell NPM Link Up to run either "npm install" or "yarn" in each project; ' +
    'using npm instead of yarn is the default.'
  },

  {
    names: ['link-all'],
    type: 'bool',
    help: 'This option will tell NPM Link Up to run either "npm install" or "yarn" in each project; ' +
    'using npm instead of yarn is the default.'
  },

  {
    names: ['install-main'],
    type: 'bool',
    help: 'This option will tell NPM Link Up to run "npm install" on the main project.'
  },

  {
    names: ['link-main'],
    type: 'bool',
    help: 'This option will tell NPM Link Up to run "npm link" on the main project.'
  },

  {
    names: ['search-root'],
    type: 'arrayOfString',
    help: 'Path to use to begin searching for relevant NPM packages; overrides config. ' +
    'To add multiple search-root\'s, use "--search-root x --search-root y".'
  },

  {
    names: ['search-root-append'],
    type: 'arrayOfString',
    help: 'Path to use to begin searching for relevant NPM packages; appends to existing config values. ' +
    'To add multiple search-root-append\'s, use "--search-root-append x --search-root-append y".'
  },

  {
    names: ['self-link-all'],
    type: 'bool',
    help: 'Link all projects to themselves; to have unique behavior per project, ' +
    'add a "self" property to each project\'s .nlu.json file.'
  },

  {
    names: ['npm-shell-version', 'use-shell-version', 'shell-version'],
    type: 'bool',
    help: 'Use the NPM version that is active in the shell.',
    default: false
  },

  {
    names: ['override'],
    type: 'bool',
    help: 'Override any warnings.',
    default: false
  },

  {
    names: ['clear-all-caches'],
    type: 'bool',
    help: 'Clear all relevant NPM / Yarn / etc caches.',
    default: false
  },

  {
    names: ['manager-all'],
    type: 'string',
    help: 'Choose between "npm" and "yarn", to manage packages; this option will affect ' +
    'all your relevant local projects; to have unique behavior per project,' +
    'add a "manager" property to the .nlu.json file in a given project.',
    default: 'npm'
  }
];
