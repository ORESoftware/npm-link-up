# NPM-Link-Up

Use the CLI interface to link your local projects together for rapid and pain-free local
development.


## Installation

### ```npm install -g npm-link-up```

If you use NVM, and switch Node.js versions frequently, you should use the following
installation method instead:

```cd $HOME && mkdir -p .npmlinkup && cd .npmlinkup && npm install npm-link-up@latest```

you might get a warning that there is no package.json file, just ignore it

then add this to your ~./bashrc file:

```bash
export PATH=$PATH:$HOME/.npmlinkup/node_modules/.bin

function npmlinkup(){
  command npmlink $@
}
```

There is really no good reason to install this module locally to a project.
So one of the two above install methods should be sufficient.


## Usage

Create a file called ```npm-link-up.json``` in the root of your project, (heretofore "project X"). The reason
you are using this CLI tool, of course, is because there are other local projects that
are dependencies of project X.

The following is a simple npm-link-up.json file:

```json
{
  "searchRoots": [   
    "HOME"
  ],
  "ignore": [
    "node_modules",
    ".git"
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
         \       /
          \     /
           \   / 
             F 
             
```             


1. Using the "searchRoots" directory/ies, the tool looks for the NPM package roots that match 
the names in the "list" property in the npm-link-up.json file. This is nice because you can move projects around
on your filesystem at will, and the tool still works; it also requires less configuration.

2. It moves up the dependency tree, for each dependency z, it runs

    a.  cd <package z> # change directory to the package root
    b.  npm install    # self-explanatory, always runs this, for the obvious reasons
    c.  npm link <x>   # runs this for each dependency, that is in the list above.
    d.  npm link .     # links the local project globally
    e.  npm link <z>   # if "linkToItself" is true, will link the project to itself (useful for running the tests)

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






