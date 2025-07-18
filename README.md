# CodeMirror 6 based editor with filetree component

This is an attempt at implementing a friend browser-based web content editor, using [codemirror 6](https://codemirror.net), and [[custom-file-tree]](https://github.com/pomax/custom-file-tree) as file tree component (as codemirror itself only models single editing panels).

## how do I use this?

It's a node project, so you'll need that installed (I recommend `nvm` or its windows equivalent), then clone this repo (or fork it and then clone that) and run `npm install`. Things should be cross-platform enough to work on Windows, Mac, and Linux by running `npm start` and then opening the URL that tells you things are running on.

File operations are persisted to the file system by sending diffs, with content hashing to verify that what the client has loaded, and what's on-disk on the server, are the same.

## I want more

I know. [Get in touch](https://github.com/Pomax/browser-editor-tests/issues). We can do more.

- [Pomax](https://mastodon.social/deck/@TheRealPomax)
