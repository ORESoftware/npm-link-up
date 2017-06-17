exports.default = [
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
    names: ['log'],
    type: 'bool',
    help: 'Write to output log in project.',
    default: true
  },
  {
    names: ['force'],
    type: 'bool',
    help: 'Force execution at hand.',
    default: false
  },
  {
    names: ['completion'],
    type: 'bool',
    help: 'Generate bash-completion code.',
    hidden: true
  },
  {
    names: ['install-all'],
    type: 'bool',
    help: 'The "install" option will tell NPM Link Up to run either "npm install" or "yarn" in each project; ' +
    'using npm instead of yarn is the default.'
  },
  {
    names: ['inherit-log'],
    type: 'bool',
    help: 'Send child process stdout/stderr to stdout.'
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
    'add a "self" property to each project\'s npm-link-up.json file.'
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
    'add a "manager" property to the npm-link-up.json file in a given project.',
    default: 'npm'
  }
];