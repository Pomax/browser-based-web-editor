# CodeMirror 6 based editor with filetree component

This is an attempt at implementing a friend browser-based web content editor, using [codemirror 6](https://codemirror.net), a [custom-file-tree](https://github.com/pomax/custom-file-tree) as file tree component (as codemirror itself only models single editing panels), and a sprinkling of docker for runtime isolation and a reverse proxy because we like opening https URLs, and we don't like having to remember port numbers.

## How do I use this?

1. It's a node project, so you'll need that installed (I recommend `nvm` or its windows equivalent).
1. You'll also need docker installed, which has different instructions depending on the OS you're using.
1. And you'll want `caddy` installed, for reverse-proxying container ports so you can just load https://projectname.localhost

With those installed:

- clone this repo (or fork it and then clone that),
- run `git checkout with-filetree` in the repo folder,
- run `npm install` in the repo folder.

Things should be cross-platform enough to work on Windows, Mac, and Linux by running `npm start` and then opening the URL that tells you things are running on.

The initial view is the "anonymous" view but you can click the "Switch" button and pick any project name that isn't `anonymous` or `testproject`. Doing so will either load the content associated with that project's content folder, or will build a new folder with a copy of the content found in the testproject folder, then build a docker container for that content, then run that container.

## Docker?

While project _content_ lives in the content directory, you don't want it to _run_ in that context. That would give it access to.. well... everything. Including other project's content, the editor code, etc. etc. So instead, the runtime is handled by creating a Docker image running Ubuntu with Node and Python installed, with the project content as a "bind mount" (meaning the files live on the host OS, but the docker container has read/write access to them), with the container running whatever is in `run.sh` as its startup instruction.

(NOTE: updating `run.sh` does nothing on its own right now, because there's no `fs.watch` instruction to see if containers need to be restarted because the run file got updated yet. That's not overly complicated to add in, but also something for "soon" rather than "now")

### How do I install Docker?

On MacOS, install `docker` and `colima` using your favourite package manager, I use `brew` but people have opinions about this so use whatever works for you. Just remember that you'll need to run `colima start` any time you reboot your mac, because otherwise anything docker-related will crash out with super fun error messages.

On Linux, you already know how to install Docker. And if you don't, you know how to look it up. And you know it's either going to be two commands, or half a day of work, depending on your chosen flavour of Linux.

On Windows... &lt;sigh&gt; on Windows it's both "easy" and "truly ridiculous", so here's what I had to do:

1. make sure the Hyper-V, Containers, and WSL windows components are installed
1. install Docker Desktop, but I'd recommend using [v4.38 of Docker Desktop](https://docs.docker.com/desktop/release-notes/#4380) because I can't get any more recent versions to work properly myself.
1. after installing Docker Desktop and restarting (seriously? we need to restart the OS?), first fire up WSL and make sure you have a linux installed. Any will do, just make it install Ubuntu, you don't care (unless you do, in which case you probablya already have something installed. Nice!)

This is about to get stupid. We're not going to do _anything_ with WSL, we just need to have a linux flavour installed _and have a command prompt open for it_.

1. Then, we'll need to switch Docker Desktop from using "docker-windows" to using "docker-linux" (i.e. _the thing everyone else uses), so open Docker Desktop, go to the settings, go to "builders", click the "docker-linux" ⋮ menu and click "use". This will fail with an irrelevant API error.
1. Keep Docker Desktop open, and open a cmd prompt with admin rights, cd to `C:\Program Files\Docker\Docker` and then run `DockerCLI.exe -SwitchDaemon`.
1. Once that's done, close the command prompt, WSL, and quit (really quit, not close-and-minimize) Docker Desktop.
1. Reopen Docker Desktop. Check the builders. F'ing magic, it worked, it now works the way it works everywhere else, which is what it should have been in the first place.

### So then what?

When you switch projects, the server runs through the following four steps:

1. Check if there is a docker image for this project
1. If not, build one
1. Check if there is a container running, based on that image
1. If not, run a container

(this also means that on first-time switching, it'll take a while before the server finally loads up the editor for your new project because building the image takes time).

The run command includes a PORT variable that allows the preview to work: each docker container exposes its port 8000, which gets bound to "whichever free port is available on the host OS", save alongside the project's name and dir in their server session, and the editor the makes sure that that port gets used for the preview iframe.

## Edit syncing

File operations are persisted to the file system by sending diffs, with content hashing to verify that what the client has loaded, and what's on-disk on the server, are the same.

This is currently one-way, using POST operations, rather than two-way using websockets. There's nothing preventing websockets from being used, but (a) make it work first, and (b) websocket security doesn't exist, so we'd have to write a bunch of code to make all of that work well. We can do that later.

## This looks... spartan

There's a decades old recipe for doing software development:

1. make it work,
2. make it work properly (aka "make it fast", "make it secure", etc.),
3. make it nice

We're still in phase 1.

## I want more

I know. [Get in touch](https://github.com/Pomax/browser-editor-tests/issues). We can do more.

- [Pomax](https://mastodon.social/deck/@TheRealPomax)
