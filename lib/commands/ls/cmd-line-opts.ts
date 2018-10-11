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
    names: ['allow-unknown'],
    type: 'bool',
    help: 'Allow unknown/unrecognized options at the command line.',
    default: false,
    hidden: true,
    env: 'nlu_setting_allow_unknown'
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
  _args: Array<string>,
  override: boolean,
  search_root: Array<string>,
  help: boolean,
  force: boolean,
  verbosity: number
  no_use_local: boolean,
  search_root_append: string,
  debug: boolean,
  allow_unknown: boolean,
}

