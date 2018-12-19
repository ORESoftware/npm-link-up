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
    default: 3,
    env: 'nlu_verbosity_level'
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
    names: ['json'],
    type: 'bool',
    help: 'Write stdout info as JSON (use json-stdio to parse it).',
    default: false,
    hidden: true,
    env: 'nlu_setting_json'
  },

  {
    names: ['bash-completion', 'completion'],
    type: 'bool',
    help: 'Generate bash-completion code.',
    hidden: true
  }

];





export interface NLUBasicOpts {
  _args: Array<string>,
  override: boolean,
  bash_completion: boolean,
  verbosity: number,
  help: boolean,
  force: boolean,
  version: boolean,
  debug: boolean,
  allow_unknown: boolean,
}
