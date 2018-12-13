
## How NLU / NPM-Link-Up works

<b> Update: </b> During NPM version 4 days, NLU was implemented using `npm link` and `npm link x`. However, the `npm link` implementation changed with NPM version 5,
and was no longer reliable. This turned into a blessing, because NLU was then re-implemented to be much more performant, by linking projects
directly together instead of using the NPM global space. This means we can forgo re-running `npm link` for each project. Previously, we pretty
much had to always run `npm link` for each project, because we were never sure if the global NPM space had the global linkage or not, this is especially
true if users switch NPM versions with NVM. So now, NLU just uses `ln -sf`, unless you tell it do `npm i` or `npm link`.

<b>

The basic algorithm hasn't changed though, just substitute "ln -sf x y" for "npm link" in most places.


### What does the ```nlu / npmlinkup``` command do? How does it work?

This info is slightly outdated, but it still basically works this way.
Imagine we have this dependency structure, and these projects are on our local filesystem:

```

     A (our main NPM project)

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


1. Using the "searchRoots" directory(s), the tool looks for the NPM package roots that match
the names in the "list" property in the .nlu.json file. This is nice because you can move projects around
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
