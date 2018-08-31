
### Frequently Asked Questions (FAQ)

<br>

* Do all packages need to have an .nlu.json file?

>
> The minimum number of .nlu.json files is 1, that is all you need to get started.
> You only need to use an .nlu.json file in order to declare deps which should be symlinked to that package. If B is symlinked to A, A needs
> an .nlu.json file that references B. But if nothing needs to be symlinked to B, your B package does not need an .nlu.json file.
>


* Does NLU support mono-repo or just multi-repo?

>
> NLU links NPM packages together, it doesn't really matter if those packages are stored in a mono-repo or not.
> In this way, we can say that NLU is agnostic when it comes to mono-repo or multi-repo. By mono-repo, we mean
> a VCS folder (git, mercurial, etc) that tracks multiple NPM packages.
>

