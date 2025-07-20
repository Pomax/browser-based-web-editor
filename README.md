# CodeMirror 6 based editor with filetree component

This is an attempt at implementing a friend browser-based web content editor, using [codemirror 6](https://codemirror.net), and [[custom-file-tree]](https://github.com/pomax/custom-file-tree) as file tree component (as codemirror itself only models single editing panels).

## how do I use this?

1. It's a node project, so you'll need that installed (I recommend `nvm` or its windows equivalent).
1. You'll also need docker installed, which has different instructions depending on the OS you're using.

With those installed:

- clone this repo (or fork it and then clone that),
- run `git checkout with-filetree` in the repo folder,
- run `npm install` in the repo folder.

Things should be cross-platform enough to work on Windows, Mac, and Linux by running `npm start` and then opening the URL that tells you things are running on.

The initial view is the "anonymous" view but you can click the "Switch" button and pick any username that isn't `anonymous` or `testuser`. Doing so will either load the content associated with that user's content folder, or will build a new folder with a copy of the content found in the testuser folder, then build a docker container for that content, then run that container.

## Docker?

While user _content_ lives in the content directory, you don't want it to _run_ in that context. That would give it access to.. well... everything. Including other user's content, the editor code, etc. etc. So instead, the runtime is handled by creating a Docker image running Ubuntu with Node and Python installed, with the user content as a "bind mount" (meaning the files live on the host OS, but the docker container has read/write access to them), with the container running whatever is in `run.sh` as its startup instruction.

When you switch users, the server runs through the following four steps:

1. Check if there is a docker image for this user
1. If not, build one
1. Check if there is a container running, based on that image
1. If not, run a container

(this also means that on first-time switching, it'll take a while before the server finally loads up the editor for your new user).

The run command includes a PORT variable that allows the preview to work: each docker container exposes its port 8000, which gets bound to "whichever free port is available on the host OS", save alongside the user's name and dir in their server session, and the editor the makes sure that that port gets used for the preview iframe.

## Edit syncing

File operations are persisted to the file system by sending diffs, with content hashing to verify that what the client has loaded, and what's on-disk on the server, are the same.

This is currently one-way, using POST operations, rather than two-way using websockets. There's nothing preventing websockets from being used, but (a) make it work first, and (b) websocket security doesn't exist, so we'd have to write a bunch of code to make all of that work well. We can do that later.

## this looks... spartan

There's a decades old recipe for doing software development:

1. make it work,
2. make it work properly (aka "make it fast", "make it secure", etc.),
3. make it nice

We're still in phase 1.

## I want more

I know. [Get in touch](https://github.com/Pomax/browser-editor-tests/issues). We can do more.

- [Pomax](https://mastodon.social/deck/@TheRealPomax)
