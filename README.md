## NPM-Link-Up


Note: This tool currently works great with NPM v4. NPM v5 has problems, and these are problems with NPM itself,
not with this tool. I assume that NPM will fix the problems with v5.0.3 etc, and then this tool will eventually
work with later v5 releases. In short, use this tool with v4, if you can. If you get it working with v5,
please let me know which version you use, I am curious.

# About

Use the CLI interface to link your local projects together for rapid and pain-free local
development.

Should be quite a bit leaner and simpler than [Lerna](https://github.com/lerna/lerna) and 
[Rush](https://www.npmjs.com/package/@microsoft/rush).

All this tool does is automatically link your projects together with NPM link, <br>
using declarative config files and a CLI. However this requires a bit of care to ensure 
integrity, so this tool is not trival by any means.

<p>

# Example usage

See: https://github.com/sumanjs
The majority of the projects in the sumanjs org are linked together using `npm-link-up`.
Just look for the `npm-link-up.json` file in the root of each project.
https://github.com/sumanjs/suman is the "root" project.

## &#9658; Installation

### ```npm install -g npm-link-up```

If you use NVM, and switch Node.js versions frequently, you should use the following
installation method instead (installs the dep in your $HOME dir):

<p>

```
 mkdir -p ~/.npmlinkup/global && cd ~/.npmlinkup/global && 
  npm init -f && npm install -S npm-link-up@latest
```

then add this to your ~./bashrc file:

```bash
export PATH=$PATH:~/.npmlinkup/global/node_modules/.bin

function npmlinkup(){
  command npmlinkup $@
}

# if you don't want to change your $PATH, you could do this:

function npmlinkup(){
   ~/.npmlinkup/global/node_modules/.bin/npmlinkup $@
}

```

Finally, source your ~/.bashrc file in your current terminal session:

```bash
source ~/.bashrc 
```

 => npmlinkup is a long command name, but there is a thing called tab completion :)

Be sure that your system is configured so that your bashrc file is sourced for all sessions/terminals.
There is really no good reason to install this module locally to a project.
So one of the two above install methods should be sufficient.


## &#9658; Usage

Create a file called ```npm-link-up.json``` in the root of your project (we will call it "project X"). The reason
you are using this CLI tool, of course, is because there are other local projects that
are dependencies of project X. Your other local projects may have their own `npm-link-up.json` files, which in turn,
declare their own dependencies. That is expected of course, and this tool is designed to link up all dependencies for 
every project in the hierarchy.

The following is a simple npm-link-up.json file:

```js
{
  "searchRoots": [   
    "$HOME/WebstormProjects",  // the tool will search for npm packages within these dirs
    "$HOME/vscode_projects"    // it's recommended to use something more specific than $HOME             
  ],
  "ignore": [                // paths to skip; these will be converted to regex, using new RegExp(x)
    "/node_modules/",        // "any-match" style path pattern matching has always sucked IMO, this works better
    "/.git/"
  ],
  "list": [               // list the packages that you want to symlink to this project, here. NPM package name only, no paths needed.
    "socket.io",          // (these are just examples using well-known NPM packages, you will be using packages that you develop locally.)
    "mongoose",
    "lodash"
  ],
  "install": "yarn",     // we give specific instructions (a bash script) on how to install, ("npm install" is default)
  "linkToItself": true   // if true, we link this project to itself, true is the default. Linking a project to itself is useful for testing.
}
```


_Then you run the CLI tool like so:_

```bash
cd <project-X-root> && npmlinkup
```


What does the ```npmlinkup``` command do?

Well, imagine we have this dependency structure, and these projects are on our local filesystem:

```

     A (my main NPM project)

       /     \       \
      /       \       \
     B         C       H __
    / \              /  \  \
   /   \            /    \  \
  D     E          I     J   K
         \       /  \
          \     /    \
           \   /      \
             F         E
                       /
                      /
                     H
```             


1. Using the "searchRoots" directory/ies, the tool looks for the NPM package roots that match 
the names in the "list" property in the npm-link-up.json file. This is nice because you can move projects around
on your filesystem at will, and the tool still works; it also requires less configuration, and fewer command line 
arguments, etc.


2. It moves up the dependency tree, for each dependency z, it runs

    *  ```cd <package z>```     # change directory to the package root
    *  ```npm install```        # self-explanatory; will run this if --install flag is used or, install
    *  ```npm link <x>```       # runs this for each dependency, that is in the list above.
    *  ```npm link .```         # links the local project globally
    *  ```npm link <z>```       # if "linkToItself" is true, will link the project to itself (useful for running the tests)

3. If anything fails, the tool will fail with an exit code of 1.

<p>

<i>
Notice the <b>circular dependency</b> in the above tree, between <b>H</b> and <b>E</b>. This tool will handle it no problem. (NPM link makes
it pretty easy.) What it does: it starts with H and then symlinks everything but E. (H depends on E, though). Then it gets to E and symlinks everything,
including H. That it searches for all packages that have already been symlinked, but that depend on E (that would be H),
and then cd's into H and sylinks E into H, retroactively. That's all there is to it.
</i>

<p>

### **An example run, given the above tree.**

First the tool would install:

D, F, C, J, K 

Next it would run:

E, I

Next, it would run,

B, H

Finally, it would run:

A



## Caveats + Disclaimer

This will not work with MS Windows. Only MacOS and *nix systems.

Using NPM, after installing a new package, you may need to re-link with npmlinkup - this is a problem/bug with NPM.
It is a strange problem, considering that `$npm link` is an NPM feature! But when you run `$ npm install x`, it seems to break
some symlinks. On the other hand, if you use `$yarn add x` to add a new dependency, you may be able avoid this hiccup.

### Restatement of the above

The NPM link utility itself (`$npm link`)  has some flaw whereby if you install a new package to your project, 
frequently symlinks will be broken between local NPM packages. I believe NPM will fix this with newer versions. 
Unfortunately, "NPM Link Up" cannot do anything about that.
This doesn't cause any real problems, except you may have to run npmlinkup again to relink your project. 
Installing with Yarn instead of NPM may prevent this issue altogether.


### Screenshots:

![NLU cli in action](https://github.com/ORESoftware/npm-link-up/tree/master/media/cli-output.png "NLU cli in action.")

