
# NPM-Link-Up / NLU

<br>

### Caveats + Disclaimer

>
> This will not work with MS Windows. Only MacOS and *nix.
>

<br>

## About

Use the CLI interface to link your local projects together for rapid and pain-free local <br>
development. This tool automatically link your local projects together using symlinks, <br>
using declarative config and a CLI.

Should be quite a bit leaner and simpler than [Lerna](https://github.com/lerna/lerna) and 
[Rush](https://www.npmjs.com/package/@microsoft/rush).

Mono-repos are crap. Be lean and mean and use npm-link-up.

<br>

## Installation

#### ```npm i -g npm-link-up```

<br>

 => If you use NVM and switch Node.js versions frequently, then add the following to to ~/.bashrc or ~/.bash_profile:

```
. "$HOME/.oresoftware/shell.sh"
```

<br>

## Quick reference

Note, command line options override settings in .nlu.json files, as is typical.
Also note that the primary project, or root project, is known as primary/main/root, but the docs will refer to it as primary most often.
Using nlu, we can link the primary projects to other projects too, in the linking process, as nlu handles circular dependencies easily.


```bash
$ nlu run
```
>
> * will link up the current project with the packages defined by "list" in the local .nlu.json file (1)
> * this is the most common command you will run

```bash
$ nlu run --dry      # alias: --dry-run
```
>
> * will do all the reads but none of the writes from (1)...will generate a tree and display it in the console so you can see what the linked projects will look like.
>


```bash
$ nlu run --install
```
>
> * will re-install the primary project, and then do (1)
>


```bash
$ nlu run --install:all  # alias --install-all
```
>
> * will re-install all projects, including the primary project, and then do (1)
>

```bash
$ nlu run --link
```
>
> * will re-link (npm link) the primary project, and then do (1)
> * this is only useful if you have new commands to put on the $PATH in the global space


```bash
$ nlu run --link:all     # alias --link-all
```
>
> * will re-link all projects (npm link will be run from the root of every project), including the primary project, and then do (1)
> * this is only useful if you have new commands to put on the $PATH in the global space, for multiple projects.


### Complete real-world usage example:
See: https://github.com/sumanjs

The majority of the projects in the sumanjs org are linked together using `npm-link-up`. <br>
Just look for the `.nlu.json` file in the root of each project. https://github.com/sumanjs/suman is the "root/main/primary" project.

<br>

## Terminology

"Locally developed packages" are packages that may already be published to NPM, but are nevertheless <br>
still in active development on your local machine. These packages can be selectively linked together <br>
on your local machine using NLU.

## Usage

Create a config file called ```.nlu.json``` in the root of your project (we will call it "project X"). <br>

For newcomers, you can use:

```bash
nlu init --interactive   # run this from within project x
```

The reason you are using this CLI tool, of course, is because there are other local projects that <br>
are dependencies of project X. Your other local projects might have their own `.nlu.json` files, which in turn, <br>
declare their own local dependencies. That is expected of course, and this tool is designed to link up <br>
all dependencies for every project in the hierarchy.

The following is a simple .nlu.json file:

```js
{
  "npm-link-up": true,
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
  "install": "yarn",     // we give specific instructions (a bash script) on how to install, ("npm install" is default)
  "linkToItself": true   // if true, we link this project to itself; true is the default. Linking a project to itself is useful for testing.
}
```


_Then you run the CLI tool like so:_

```bash
nlu run   # run this from within project x
```


## How it works in detail

>
> See: `docs/in-detail.md`
>

<br>

### Screenshots:

![NLU cli in action](media/cli-output.png)

