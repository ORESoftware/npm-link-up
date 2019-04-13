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
    default: 2,
    env: 'nlu_verbosity_level'
  },

  {
    names: ['debug', 'd'],
    type: 'bool',
    help: 'Show debug logging.',
    default: false,
    hidden: true,
    env: 'nlu_is_debug'
  },

  {
    names: ['config', 'conf', 'c'],
    type: 'string',
    help: 'Path to an .nlu.json file.',
    default: '',
    env: 'nlu_config_path'
  },

  {
    names: ['umbrella'],
    type: 'bool',
    help: 'Umbrella usage - running nlu from outside an NPM project.',
    default: false,
    env: 'nlu_is_umbrella'
  },

  {
    names: ['all-packages', 'all'],
    type: 'bool',
    help: 'Link-up all packages in working dir.',
    default: false
  },
  
  {
    names: ['every'],
    type: 'bool',
    help: 'Link-up all packages, even those without an .nlu.json file.',
    default: false
  },

  {
    names: ['allow-unknown'],
    type: 'bool',
    help: 'Allow unknown/unrecognized options at the command line.',
    default: false,
    hidden: true,
    env: 'nlu_setting_allow_unknown'
  },

  {
    names: ['no-install'],
    type: 'bool',
    help: 'Do not run "npm install" at any time.',
    default: false,
    hidden: true,
    env: 'nlu_setting_no_install'
  },

  {
    names: ['no-link'],
    type: 'bool',
    help: 'Allow unknown/unrecognized options at the command line.',
    default: false,
    hidden: true,
    env: 'nlu_setting_no_link'
  },

  {
    names: ['treeify'],
    type: 'bool',
    help: 'Log a tree representation of your project\'s npm-link-up dependencies and exit. This is cool.',
    env: 'nlu_setting_treeify'
  },

  {
    names: ['dry-run', 'dry'],
    type: 'bool',
    help: 'Simulates the run and provides a visual tree report - does zero writes, just does reads.',
    default: false,
    env: 'nlu_setting_dry_run'
  },

  {
    names: ['force'],
    type: 'bool',
    help: 'Force execution at hand.',
    default: false,
    env: 'nlu_setting_force'
  },
  
  {
    names: ['ignore','i'],
    type: 'arrayOfString',
    help: 'Ignore given file path(s) during search.',
  },

  {
    names: ['install-all', 'install:all'],
    type: 'bool',
    help: 'This option will tell NPM Link Up to run either "npm install" or "yarn" in each project; ' +
      'using npm instead of yarn is the default.',
    env: 'nlu_setting_install_all',
  },

  {
    names: ['link-all', 'link:all'],
    type: 'bool',
    help: 'This option will tell NPM Link Up to run either "npm link" or "yarn link" in each project; ' +
      'using npm instead of yarn is the default.',
    env: 'nlu_setting_link_all'
  },

  {
    names: ['install-main', 'install:main', 'install'],
    type: 'bool',
    help: 'This option will tell NPM Link Up to run "npm install" on the main project.',
    env: 'nlu_setting_install_main'
  },

  {
    names: ['link-main', 'link:main', 'link'],
    type: 'bool',
    help: 'This option will tell NPM Link Up to run "npm link" on the main project.',
    env: 'nlu_setting_link_main'
  },

  {
    names: ['search-root', 'search'],
    type: 'arrayOfString',
    help: 'Path to use to begin searching for relevant NPM packages; overrides config. ' +
      'To add multiple search-root\'s, use "--search-root x --search-root y".'
  },

  {
    names: ['search-root-append', 'append-search-root','append-search', 'search-append'],
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
    names: ['no-use-local', 'no-local-bin', 'no-local'],
    type: 'bool',
    help: 'Do not add local node_modules/.bin to the $PATH.',
    default: false,
    env: ['nlu_setting_no_local_bin']
  },

  {
    names: ['override'],
    type: 'bool',
    help: 'Override any warnings.',
    default: false
  },
  
  {
    names: ['combine'],
    type: 'bool',
    help: 'Combine deps declared in .nlu.json list, with those declared in package.json.',
    default: false
  },

  {
    names: ['allow-missing'],
    type: 'bool',
    help: 'Allows nlu to continue even if a package cannot be found.',
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



export interface NLURunOpts {
  config: string,
  allow_missing: boolean,
  search_from_home: boolean,
  link_main: boolean,
  install_main: boolean,
  all_packages: boolean,
  combine: boolean,
  every: boolean,
  umbrella: boolean,
  _args: Array<string>,
  override: boolean,
  link_all: boolean,
  search_root: Array<string>,
  clear_all_caches: boolean,
  install_all: boolean,
  self_link_all: boolean,
  help: boolean,
  dry_run: boolean,
  force: boolean,
  production: boolean
  verbosity: number
  no_use_local: boolean,
  search_root_append: string,
  no_link: boolean,
  no_install: boolean,
  debug: boolean,
  allow_unknown: boolean,
}

