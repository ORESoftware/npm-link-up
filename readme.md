
<img width="200px" align="right" src="https://raw.githubusercontent.com/oresoftware/media/master/namespaces/nlu/oresoftware-nlu4-rounded.png?foo">

[<img src="https://img.shields.io/badge/slack-@oresoftware/nlu-yellow.svg?logo=slack">](https://oresoftware.slack.com/messages/CCAHLP5BK)

[![Gitter](https://badges.gitter.im/oresoftware/npm-link-up.svg)](https://gitter.im/oresoftware/npm-link-up?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge)
[![Version](https://img.shields.io/npm/v/npm-link-up.svg?colorB=green)](https://www.npmjs.com/package/npm-link-up)

# NPM-Link-Up / NLU

<br>

### Caveats + Disclaimer

>
> This will not work with MS Windows. Only MacOS and *nix. 
> If you are interested in getting to work on Windows, pls file a ticket.
>

<br>

## Video demo

Watch this video to learn how to use NLU: goo.gl/a9u1rr


The video references this example repo:
https://github.com/ORESoftware/rolo-cholo-yolo

<br>

## About

Use the CLI interface to link your local projects together for rapid and pain-free local
development. This tool links your local NPM packages together using symlinks, using declarative files. 

<br>

NLU is agnostic regarding mono-repo vs. multi-repo. NLU is simply used to link NPM packages on your fs together 
by way of the respective node_modules folders. For example, if you want to store multiple NPM packages in a mono-repo, that's fine,
and NLU can be used to link them together for local development.

<br>

NLU uses `.nlu.json` declaration files, which tells NLU about other local dependencies.

<br>

NLU should be quite a bit leaner and simpler than [Lerna](https://github.com/lerna/lerna) and
[Rush](https://www.npmjs.com/package/@microsoft/rush).

<br>

NLU is one of several tools that make managing multiple locally developed packages easier.

<b> The current pieces are: </b>

* [npm-link-up (NLU)](https://github.com/ORESoftware/npm-link-up) => links multiple NPM packages together for local development
* [r2g](https://github.com/ORESoftware/r2g) => tests local packages <i>properly</i> before publishing to NPM
* [npp](https://github.com/ORESoftware/npp) => publish multiple packages and sync their semver versions

<br>

## Installation

<br>

```bash
$ npm i -g npm-link-up
```

<br>

If you use NVM and switch Node.js versions frequently, then add the following to to ~/.bashrc or ~/.bash_profile:

```bash
. "$HOME/.oresoftware/shell.sh"
```

<i> => Note, you will also get bash completion for NLU, if you source the above. </i>

<br>


# Workflows

There are two types of workflows:

1. <b> Workflow 1 - you have an NPM package on your fs in a folder, and you have other local packages you'd like to link to it. </b>

<br>

This is the simple/normal case. This case is known as "I have a package and I want to symlink stuff to it."

Simply run `nlu init` in the root of your package.

```
{
  "npm-link-up": true,
  "linkToSelf": false,
  "linkToItself": false,
  "searchRoots": [
    ".."                    # we search one directory below
  ],
  "list": [
    "xxx",
    "yyy",
    "zzz",
  ]
}
```

xxx,yyy,zzz are the package names of the packages you wish to link to your current/primary package.
Using `"searchRoots": [".."]`, means it will look for xxx,yyy,zzz within the parent directory of your primary package.

<br>

2. <b> Workflow 2 - You have a mono-repo with N npm packages in it. </b> <br>

<br>

This case is known as "I have multiple packages of concern and I want to make sure they all get their desired symlinks".
It doesn't have to be a mono-repo, it can just be that you want to run the symlinking thing for multiple packages at once.
The packages don't even have to relate to each other at all.

Something like:

```
 monorepo/
    packagea/{package.json,.nlu.json}
    packageb/{package.json,.nlu.json}
    packagec/{package.json,.nlu.json}
 .nlu.umbrella.json

```

In .nlu.umbrella.json, put this:

```
{
  "npm-link-up": true,
  "linkToSelf": false,
  "linkToItself": false,
  "searchRoots": [
    "."            # just search the current dir, no need to go up a dir
  ],
  "list": [
    "packagea",
    "packageb",
    "packagec",
  ]
}
```

run `nlu init` from each of packagea,packageb,packagec, then in the root of the monorepo, run:

```bash
$ nlu run --umbrella -c .nlu.umbrella.json  # --umbrella option tells nlu not to put a node_modules folder in the mono-repo root
```

If you are missing deps, that's ok, just use --allow-missing.

Special note: If you cannot add .nlu.json files to the packages b/c maybe your people are picky, there is a way to just use an nlu.umbrella.json file.
File a ticket and I will explain how to do that.



## Quick reference

Note, command line options override the settings in `.nlu.json` files, as is typical.
Also note that the primary project, or root project, is known as primary/main/root, but the docs will strive to refer to it as "primary" most often.
Using NLU, we can link the primary project to other projects too, in the linking process, as nlu handles circular dependencies easily.

<br>

The basic command:

>
>```bash
>$ nlu run
>```
>
> * will link up the current project with the packages defined by "list" in the local .nlu.json file (1)
> * this is the most common command you will run
>

<br>

>
>```bash
>$ nlu run --dry      # alias: --dry-run
>```
>
> * will do all the reads but none of the writes from (1)...will generate a tree and display it in the console so you can see what the linked projects will look like.
>

<br>

>
>```bash
>$ nlu ls      # alias: --dry-run
>```
>
> * Using the current working directory as the search root, will display a tree in the console of all symlinked packages in all folders.
> * Using `$ nlu ls -a`, in future versions, you can see all symlinks, not just symlinked dirs in node_modules. 
>

<br>

>
>```bash
>$ nlu run --install
>```
>
> * will re-install the primary project, and then do (1)
>

<br>

>
>```bash
>$ nlu run --install:all
>```
>
> * will re-install all projects, including the primary project, and then do (1)
>

<br>

>
>```bash
>$ nlu run --link
>```
>
> * will re-link (npm link) the primary project, and then do (1)
> * this is only useful if you have new commands to put on the $PATH in the global space


<br>

>
>```bash
>$ nlu run --link:all
>```
>
> * will re-link all projects (npm link will be run from the root of every project), including the primary project, and then do (1)
> * this is only useful if you have new commands to put on the $PATH in the global space, for multiple projects.

<br>

>
>```bash
>$ nlu init
>```
>
> * will generate an .nlu.json file for your working project.
> * Use `nlu init -f` to skip the interactive part, and use dirname of the working directory as the searchRoot.
>

<br>

### The .nlu.json configuration file

Your primary project needs an `.nlu.json` file, which can be auto-generated using `nlu init` (see below, for instructions.)

<br>

The two most important fields in the `.nlu.json` file are `"searchRoots"` and `"list"`.

```js
{
  "searchRoots": [     // the tool will search for npm packages within these dirs
    "$HOME/WebstormProjects", 
    "../socket.io",
    "../../mongoose"
  ],
  "list": [        // list the local packages that you want to symlink to this project, here. NPM package name only, no paths needed.
    "socket.io",   // (these are just examples using well-known NPM packages, you will be using packages that you develop locally.)
    "mongoose",
    "lodash"
  ]
}
```

<br>

The `"list"` field, is an array of the package names - these need to match the package.json name field for whatever packages you want to link
to your primary project.

<br>

The `"searchRoots"` field is an array of places to search for packages on your filesystem. You can use relative paths, or alternatively,
just use a grandparent directory which contains all of your projects. Using the latter technique is highly recommended.
Using relative paths is more error-prone and requires more maintenance, and is more verbose. *You can use env variables in your searchRoots paths*.

<br>

## Terminology

"Locally developed packages" are packages that may already be published to NPM, but are nevertheless
still in active development on your local machine. These packages can be selectively linked together
on your local machine using NLU.

<br>

## Getting Started

Create a config file called ```.nlu.json``` in the root of your project (we will call it "project X"). <br>

For newcomers, you can use the following command to generate a proper .nlu.json file:

```bash
 $ nlu init   # run this from within project x
```

Follow the instructions in `nlu init`. After you get better with NLU, you can just run `nlu init -f` to skip the interactive bit, or just create `.nlu.json` files by hand.


The reason you are using this CLI tool, of course, is because there are other local projects that <br>
are dependencies of project X. Your other local projects might have their own `.nlu.json` files, which in turn, <br>
declare their own local dependencies. That is expected of course, and this tool is designed to link up <br>
all dependencies for every project in the hierarchy.

The following is a simple .nlu.json file:

```js
{
  "npm-link-up": true,
  "linkable": true,
  "searchRoots": [   
    "$HOME/WebstormProjects",  // the tool will search for npm packages within these dirs
    "$HOME/vscode_projects"
  ],
  "comments":[],
  "ignore": [                // paths to skip; these will be converted to regex, using new RegExp(x)
    "/node_modules/",
    "/.git/"
  ],
  "list": [               // list the local packages that you want to symlink to this project, here. NPM package name only, no paths needed.
    "socket.io",          // (these are just examples using well-known NPM packages, you will be using packages that you develop locally.)
    "mongoose",
    "lodash"
  ],
  "linkToItself": true   // if true, we link this project to itself; true is the default. Linking a project to itself is useful for testing.
}
```


After creating an .nlu.json file in the root of your project that's all you need to do, and then run:

```bash
$ nlu run   # run this from within project x
```


## How it works in detail

>
> See: `docs/in-detail.md`
>

<br>


## F.A.Q.

>
> See: `docs/faq.md`
>

<br>


### Complete real-world usage example:
See: https://github.com/sumanjs/suman-mono

<br>


#### `$ nlu ls` command example

Using ```$ nlu ls ``` is a fun read-only utility - it shows you all the symlinks on the fs in your current folder:

```

      └─ suman-mono (root)
           ├─ browser
           │  └─ node_modules
           │     └─ suman-types: ❖ /home/oleg/codes/sumanjs/suman-mono/types 
           ├─ browser-polyfills
           │  └─ node_modules
           │     └─ suman-types: ❖ /home/oleg/codes/sumanjs/suman-mono/types 
           ├─ daemon
           │  └─ node_modules
           │     ├─ poolio: ❖ /home/oleg/codes/oresoftware/poolio 
           │     ├─ residence: ❖ /home/oleg/codes/oresoftware/residence 
           │     ├─ suman-daemon: ❖ /home/oleg/codes/sumanjs/suman-mono/daemon 
           │     ├─ suman-types: ❖ /home/oleg/codes/sumanjs/suman-mono/types 
           │     └─ suman-utils: ❖ /home/oleg/codes/sumanjs/suman-mono/utils 
           ├─ events
           │  └─ node_modules
           │     └─ suman-browser-polyfills: ❖ /home/oleg/codes/sumanjs/suman-mono/browser-polyfills 
           ├─ interactive
           │  └─ node_modules
           │     ├─ suman-interactive: ❖ /home/oleg/codes/sumanjs/suman-mono/interactive 
           │     └─ suman-utils: ❖ /home/oleg/codes/sumanjs/suman-mono/utils 
           ├─ refine
           │  └─ node_modules
           │     ├─ suman-r: ❖ /home/oleg/codes/sumanjs/suman-mono/refine 
           │     ├─ json-stdio: ❖ /home/oleg/codes/oresoftware/json-stdio 
           │     ├─ suman-events: ❖ /home/oleg/codes/sumanjs/suman-mono/events 
           │     ├─ suman-reporters: ❖ /home/oleg/codes/sumanjs/suman-mono/reporters 
           │     ├─ suman-types: ❖ /home/oleg/codes/sumanjs/suman-mono/types 
           │     ├─ residence: ❖ /home/oleg/codes/oresoftware/residence 
           │     ├─ suman-utils: ❖ /home/oleg/codes/sumanjs/suman-mono/utils 
           │     └─ tap-json-parser: ❖ /home/oleg/codes/oresoftware/tap-json-parser 
           ├─ reporters
           │  └─ node_modules
           │     ├─ suman-reporters: ❖ /home/oleg/codes/sumanjs/suman-mono/reporters 
           │     ├─ json-stdio: ❖ /home/oleg/codes/oresoftware/json-stdio 
           │     ├─ suman-browser-polyfills: ❖ /home/oleg/codes/sumanjs/suman-mono/browser-polyfills 
           │     ├─ suman-events: ❖ /home/oleg/codes/sumanjs/suman-mono/events 
           │     ├─ suman-types: ❖ /home/oleg/codes/sumanjs/suman-mono/types 
           │     └─ suman-utils: ❖ /home/oleg/codes/sumanjs/suman-mono/utils 
           ├─ run-plugins
           │  └─ node_modules
           │     ├─ suman-run-plugins: ❖ /home/oleg/codes/sumanjs/suman-mono/run-plugins 
           │     └─ suman-types: ❖ /home/oleg/codes/sumanjs/suman-mono/types 
           ├─ shell
           │  └─ node_modules
           │     ├─ json-stdio: ❖ /home/oleg/codes/oresoftware/json-stdio 
           │     ├─ poolio: ❖ /home/oleg/codes/oresoftware/poolio 
           │     ├─ prepend-transform: ❖ /home/oleg/codes/oresoftware/prepend-transform 
           │     ├─ suman-shell: ❖ /home/oleg/codes/sumanjs/suman-mono/shell 
           │     ├─ suman-browser-polyfills: ❖ /home/oleg/codes/sumanjs/suman-mono/browser-polyfills 
           │     ├─ suman-types: ❖ /home/oleg/codes/sumanjs/suman-mono/types 
           │     └─ suman-utils: ❖ /home/oleg/codes/sumanjs/suman-mono/utils 
           ├─ suman
           │  └─ node_modules
           │     ├─ json-stdio: ❖ /home/oleg/codes/oresoftware/json-stdio 
           │     ├─ log-prepend: ❖ /home/oleg/codes/oresoftware/log-prepend 
           │     ├─ poolio: ❖ /home/oleg/codes/oresoftware/poolio 
           │     ├─ pragmatik: ❖ /home/oleg/codes/oresoftware/pragmatik 
           │     ├─ prepend-transform: ❖ /home/oleg/codes/oresoftware/prepend-transform 
           │     ├─ proxy-mcproxy: ❖ /home/oleg/codes/oresoftware/proxy-mcproxy 
           │     ├─ residence: ❖ /home/oleg/codes/oresoftware/residence 
           │     ├─ suman: ❖ /home/oleg/codes/sumanjs/suman-mono/suman 
           │     ├─ suman-browser: ❖ /home/oleg/codes/sumanjs/suman-mono/browser 
           │     ├─ suman-browser-polyfills: ❖ /home/oleg/codes/sumanjs/suman-mono/browser-polyfills 
           │     ├─ suman-daemon: ❖ /home/oleg/codes/sumanjs/suman-mono/daemon 
           │     ├─ suman-events: ❖ /home/oleg/codes/sumanjs/suman-mono/events 
           │     ├─ suman-interactive: ❖ /home/oleg/codes/sumanjs/suman-mono/interactive 
           │     ├─ suman-r: ❖ /home/oleg/codes/sumanjs/suman-mono/refine 
           │     ├─ suman-reporters: ❖ /home/oleg/codes/sumanjs/suman-mono/reporters 
           │     ├─ suman-run-plugins: ❖ /home/oleg/codes/sumanjs/suman-mono/run-plugins 
           │     ├─ suman-shell: ❖ /home/oleg/codes/sumanjs/suman-mono/shell 
           │     ├─ suman-transform-plugins: ❖ /home/oleg/codes/sumanjs/suman-mono/transform-plugins 
           │     ├─ suman-types: ❖ /home/oleg/codes/sumanjs/suman-mono/types 
           │     ├─ suman-utils: ❖ /home/oleg/codes/sumanjs/suman-mono/utils 
           │     ├─ suman-watch: ❖ /home/oleg/codes/sumanjs/suman-mono/watch 
           │     ├─ suman-watch-plugins: ❖ /home/oleg/codes/sumanjs/suman-mono/watch-plugins 
           │     └─ vamoot: ❖ /home/oleg/codes/oresoftware/vamoot 
           ├─ tools
           │  └─ node_modules
           │     └─ residence: ❖ /home/oleg/codes/oresoftware/residence 
           ├─ transform-plugins
           │  └─ node_modules
           │     ├─ suman-transform-plugins: ❖ /home/oleg/codes/sumanjs/suman-mono/transform-plugins 
           │     └─ suman-types: ❖ /home/oleg/codes/sumanjs/suman-mono/types 
           ├─ types
           │  └─ node_modules
           ├─ utils
           │  └─ node_modules
           │     ├─ suman-utils: ❖ /home/oleg/codes/sumanjs/suman-mono/utils 
           │     ├─ suman-browser-polyfills: ❖ /home/oleg/codes/sumanjs/suman-mono/browser-polyfills 
           │     ├─ suman-types: ❖ /home/oleg/codes/sumanjs/suman-mono/types 
           │     └─ residence: ❖ /home/oleg/codes/oresoftware/residence 
           ├─ watch
           │  └─ node_modules
           │     ├─ poolio: ❖ /home/oleg/codes/oresoftware/poolio 
           │     ├─ prepend-transform: ❖ /home/oleg/codes/oresoftware/prepend-transform 
           │     ├─ residence: ❖ /home/oleg/codes/oresoftware/residence 
           │     ├─ suman-browser-polyfills: ❖ /home/oleg/codes/sumanjs/suman-mono/browser-polyfills 
           │     ├─ suman-events: ❖ /home/oleg/codes/sumanjs/suman-mono/events 
           │     ├─ suman-run-plugins: ❖ /home/oleg/codes/sumanjs/suman-mono/run-plugins 
           │     ├─ suman-transform-plugins: ❖ /home/oleg/codes/sumanjs/suman-mono/transform-plugins 
           │     ├─ suman-types: ❖ /home/oleg/codes/sumanjs/suman-mono/types 
           │     ├─ suman-watch: ❖ /home/oleg/codes/sumanjs/suman-mono/watch 
           │     ├─ suman-utils: ❖ /home/oleg/codes/sumanjs/suman-mono/utils 
           │     └─ suman-watch-plugins: ❖ /home/oleg/codes/sumanjs/suman-mono/watch-plugins 
           └─ watch-plugins
              └─ node_modules
                 ├─ suman-browser-polyfills: ❖ /home/oleg/codes/sumanjs/suman-mono/browser-polyfills 
                 ├─ suman-events: ❖ /home/oleg/codes/sumanjs/suman-mono/events 
                 ├─ suman-reporters: ❖ /home/oleg/codes/sumanjs/suman-mono/reporters 
                 ├─ suman-run-plugins: ❖ /home/oleg/codes/sumanjs/suman-mono/run-plugins 
                 ├─ suman-transform-plugins: ❖ /home/oleg/codes/sumanjs/suman-mono/transform-plugins 
                 ├─ suman-types: ❖ /home/oleg/codes/sumanjs/suman-mono/types 
                 ├─ suman-utils: ❖ /home/oleg/codes/sumanjs/suman-mono/utils 
                 ├─ suman-watch: ❖ /home/oleg/codes/sumanjs/suman-mono/watch 
                 └─ suman-watch-plugins: ❖ /home/oleg/codes/sumanjs/suman-mono/watch-plugins 


```


### Screenshots:

TBD
