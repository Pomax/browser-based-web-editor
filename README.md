# CodeMirror 6 based editor with filetree component

This is an attempt at implementing a friend browser-based web content editor, using [codemirror 6](https://codemirror.net), and [[custom-file-tree]](https://github.com/pomax/custom-file-tree) as file tree component (as codemirror itself only models single editing panels).

## how do I use this?

It's a node project, so you'll need that installed (I recommend `nvm` or its windows equivalent), then clone this repo (or fork it and then clone that) and run `npm install`. Things should be cross-platform enough to work on Windows, Mac, and Linux by running `npm start` and then opening the URL that tells you things are running on.

The initial view is the "anonymous" view but you can click the "Switch" button and pick any username that isn't `anonymous` or `testuser`. Doing so will either load the content associated with that content folder, or will build a new folder with a copy of the content found in the testuser folder.

File operations are persisted to the file system by sending diffs, with content hashing to verify that what the client has loaded, and what's on-disk on the server, are the same.

## this looks... spartan

1. make the code work
2. make the code clean
3. make the system secure
4. make the experience delightful.

We're still in phase 1.

## I want more

I know. [Get in touch](https://github.com/Pomax/browser-editor-tests/issues). We can do more.

- [Pomax](https://mastodon.social/deck/@TheRealPomax)
