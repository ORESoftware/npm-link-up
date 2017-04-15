# NPM-Link-Up

Use the CLI interface to link your local projects together for rapid and pain-free local
development.

Should be quite a bit leaner and simpler than [Lerna](https://github.com/lerna/lerna) and Rush.

All this tool does is automatically link your projects together with NPM link, <br>
using declarative config files and a CLI.

<p>

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
  command npmlink $@
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

Create a file called ```npm-link-up.json``` in the root of your project ("project X"). The reason
you are using this CLI tool, of course, is because there are other local projects that
are dependencies of project X.

The following is a simple npm-link-up.json file:

```js
{
  "searchRoots": [   
    "$HOME/WebstormProjects",  // the tool will search for npm packages within these dirs
    "$HOME/vscode_projects"    // it's recommended to use something more specific than $HOME             
  ],
  "ignore": [                // paths to skip, these will be converted to regex, using new RegExp(x)
    "/node_modules/",        // "any-match" style path pattern matching has always sucked IMO
    "/.git/"
  ],
  "list": [
    "residence",
    "pragmatik"
  ]
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
             
```             


1. Using the "searchRoots" directory/ies, the tool looks for the NPM package roots that match 
the names in the "list" property in the npm-link-up.json file. This is nice because you can move projects around
on your filesystem at will, and the tool still works; it also requires less configuration.

2. It moves up the dependency tree, for each dependency z, it runs

    *  ```cd <package z>```     # change directory to the package root
    *  ```npm install```        # self-explanatory, always runs this, for the obvious reasons
    *  ```npm link <x>```       # runs this for each dependency, that is in the list above.
    *  ```npm link .```         # links the local project globally
    *  ```npm link <z>```       # if "linkToItself" is true, will link the project to itself (useful for running the tests)

3. If anything fails, the tool will fail with an exit code of 1.


**An example run, given the above tree.**

First the tool would install:

D, F, C, J, K 

Next it would run:

E, I

Next, it would run,

B, H

Finally, it would run:

A


You can set a concurrency limit, the default is 3. Meaning, no more than 3 "letters" 
can be installed at the same time.






