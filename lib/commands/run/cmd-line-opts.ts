'use strict';

export default [

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
    names: ['dry-run', 'dry'],
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
    names: ['install-all', 'install:all'],
    type: 'bool',
    help: 'This option will tell NPM Link Up to run either "npm install" or "yarn" in each project; ' +
    'using npm instead of yarn is the default.'
  },

  {
    names: ['link-all', 'link:all'],
    type: 'bool',
    help: 'This option will tell NPM Link Up to run either "npm link" or "yarn link" in each project; ' +
    'using npm instead of yarn is the default.'
  },

  {
    names: ['install-main', 'install:main', 'install'],
    type: 'bool',
    help: 'This option will tell NPM Link Up to run "npm install" on the main project.'
  },

  {
    names: ['link-main', 'link:main', 'link'],
    type: 'bool',
    help: 'This option will tell NPM Link Up to run "npm link" on the main project.'
  },

  {
    names: ['search-root', 'search'],
    type: 'arrayOfString',
    help: 'Path to use to begin searching for relevant NPM packages; overrides config. ' +
    'To add multiple search-root\'s, use "--search-root x --search-root y".'
  },

  {
    names: ['search-root-append', 'append-search', 'search-append'],
    type: 'arrayOfString',
    help: 'Path to use to begin searching for relevant NPM packages; appends to existing config values. ' +
    'To add multiple search-root-append\'s, use "--search-root-append x --search-root-append y".'
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

  {
    names: ['override'],
    type: 'bool',
    help: 'Override any warnings.',
    default: false
  },

  {
    names: ['production', 'prod'],
    type: 'bool',
    help: 'Use the --production flag with npm install / npm link; only applies when using using --install or --link options.',
    default: false,
    env: ['nlu_setting_prod', 'nlu_setting_production']
  },

  {
    names: ['clear-all-caches', 'clear-caches'],
    type: 'bool',
    help: 'Clear all relevant NPM / Yarn / etc caches.',
    default: false
  },

  {
    names: ['yarn'],
    type: 'bool',
    help: 'Use yarn for installs and linking.',
    env: 'nlu_setting_yarn',
    default: false
  }
];
