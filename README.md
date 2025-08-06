# CodeMirror 6 based editor with filetree component

<table border="1" cellpadding="0" cellspacing="0"><tr><td><img width="100%" src="https://github.com/user-attachments/assets/fae319b0-e39b-4369-a81e-df8cca233b57"></td><tr></table>

This is an attempt at implementing a friend browser-based web content editor, using [codemirror 6](https://codemirror.net), a [custom-file-tree](https://github.com/pomax/custom-file-tree) as file tree component (as codemirror itself only models single editing panels), and a sprinkling of docker for runtime isolation and a reverse proxy because we like opening https URLs, and we don't like having to remember port numbers.

## How do I use this?

1. It's a node project, so you'll need that installed (I recommend `nvm` or its windows equivalent).
1. You'll also need docker installed, which has different instructions depending on the OS you're using.
1. And you'll want `caddy` installed, for reverse-proxying container ports so you can just load https://projectname.localhost
1. Finally, you need `sqlite3` installed. Rinse and repeat for linux or MacOs, on Windows you'll want to donwnload the `sqlite-tools-win-x64-3500400.zip` from https://www.sqlite.org/download.html, create a `C:\Program Files\Sqlite3`, and unpack the zip file into that, then add that folder to your PATH (The "Docker" section below goes over how you do that for docker, just do the same for sqlite3).

With those prerequisites met:

- clone this repo (or fork it and then clone that),
- run `git checkout with-filetree` in the repo folder,
- run `npm install` in the repo folder.


Things should be cross-platform enough to work on Windows, Mac, and Linux by running `npm start` and then opening the URL that tells you things are running on.

The main page has a login link that uses github authentication (for now). After authenticating, you're dropped into what is basically a "profile-ish" view (which I'm sure will change in the future, but we're still in the PoC phase) where you can create new projects, load up projects you've made, and delete projects you no longer care about.

New projects currently start on a copy of the `testproject` dir, but that should of course eventually a "new, empty project" plus a list of "starters" that you can remix.

## Docker?

While project _content_ lives in the content directory on your computer (or your server, etc), you don't want it to _run_ in that context. That would give it access to.. well... everything, including other project's content, the editor's code, routing configs, etc. etc. So, instead, the runtime is handled by creating a Docker container (think virtual machine) running Ubuntu 24 with Node.js and Python preinstalled, with a project's content added in as a "bind mount" (meaning the files live on the host OS, but the docker container has read/write access to them).

Projects have a special `run.sh` file that is currently used as "what happens when your project container starts up". Also, restarting a project doesn't actually "restart" it so much as "rebuild and run it", so be aware that any data you write outside of the project's home directory (`~/app`) is, at best, temporary. The moment the project container has to restart for whatever reason, any of those changes will be lost.

### How do I install Docker?

On MacOS, install `docker` and `colima` using your favourite package manager (I use `brew` but people have opinions about this so use whatever works for you). Just remember that you'll need to run `colima start` any time you start up your mac, because otherwise anything docker-related will crash out with super fun error messages.

On Linux, you already know how to install Docker. You're using Linux. And even if you don't, you know how to look it up (...and you know it's either going to be two commands and you're done, or half a day of work, depending on your chosen flavour of Linux >_>;;)

On Windows... &lt;sigh&gt; on Windows it's both "easy" and "truly ridiculous", so here's what I had to do:

- make sure the Hyper-V, Containers, and WSL windows components are installed
- install Docker Desktop, but I'd recommend using [v4.38 of Docker Desktop](https://docs.docker.com/desktop/release-notes/#4380) because I can't get any more recent versions to work properly myself.
- after installing Docker Desktop and restarting (seriously? we need to restart the OS?), first fire up WSL and make sure you have a linux installed. Any will do, just make it install Ubuntu, you don't care (unless you do, in which case you probablya already have something installed. Nice!)

This is about to get stupid. We're not going to do _anything_ with WSL, we just need to have a linux flavour installed _and have a command prompt open for it_.

- Then, we'll need to switch Docker Desktop from using "docker-windows" to using "docker-linux" (i.e. _the thing everyone else uses_), so open Docker Desktop, go to the settings, go to "builders", click the "docker-linux" ⋮ menu and click "use". This will fail with an irrelevant API error.
- Keep Docker Desktop open, and open a cmd prompt with admin rights, cd to `C:\Program Files\Docker\Docker` and then run `DockerCLI.exe -SwitchDaemon`.
- Once that's done, close the command prompt, WSL, and quit (really quit, not close-and-minimize) Docker Desktop.
- Reopen Docker Desktop. Check the builders. F'ing magic, it worked, it'll now use linux containers just like every other OS, which is what it should have been using in the first place.

## What's caddy?

Caddy is a general purpose server (similar to Nginx) that automatically handles HTTPS, and lets us set up bindings for things like https://yourproject.app.localhost rather than having to use completely useless http://localhost:someport URLs (where the port number will change any time you restart the server). Installing it on Linux or Mac is relatively easy (tell your package manager to install it. Done), but Windows is (of course) a bit more work:

- Go to https://caddyserver.com/download, pick your windows platform, the click the blue download button.
- Rename the resulting .exe to `caddy.exe`
- Create a folder `C:\Program Files\Caddy` and then move `caddy.exe` into that (this hopefully requires UAC admin rights. If not, I may have questions about why you're logged in with an admin account rather than a normal user account)
- Hit start-x and pick "system"
- on the right of the window that opens, click "advanced system settings"
- In the sysem properties dialog this opens, click the "environment variables" button.
- In the lower panel, scroll down to `path` and double click it.
- Click "new", which will create a new, empty, entry at the bottom, and then click "browse", browse to the `C:\Program Files\Caddy` folder and select that.
- Click OK, then click OK again, then click OK again (omg Windows) and then close the system settings dialog.

You can now run `caddy` anywhere.

## So then what?

1. open the `src/docker` directory in a terminal and run `docker build -t local-base-image .`, to create the basic image that all other containers will be using as starting point
1. open the `data` directory in a terminal and run `sqlite3 data.sqlite3`. Once in the Sqlite repl, type `.read schema.sql`, and when that finishes you can double-ctrl-c back out of sqlite.

With those one-time steps completely, we can run `npm start` whenever we want.

Open the URL that `npm start` gives you, log in, and then start making projects. Project load, and project creation, runs through the following steps:

1. Check if there is a docker image for this project
1. If not, build one
1. Check if there is a container running, based on that image
1. If not, run a container

The run command includes a PORT variable that allows the preview to work: each docker container exposes its port 8000, which gets bound to "whichever free port is available on the host OS", saved alongside the project's name and dir in their server session, and the editor then makes sure that that port gets used by caddy for https://yourproject.app.localhost

### One-time Caddy permissions

Caddy will set up a name binding when you switch projects, but the first time you do that after having installed it, it will need your permission to add a new certificate authority to your OS's list of certificate authorities. You'll want to allow that, because otherwise localhost HTTPS won't work =)

## Edit syncing

File operations are persisted to the file system by sending diffs, with content hashing to verify that what the client has loaded, and what's on-disk on the server, are the same.

This is currently one-way, using POST operations, rather than two-way using websockets. There's nothing preventing websockets from being used, but (a) make it work first, and (b) websocket security doesn't exist, so we'd have to write a bunch of code to make all of that work well. We can do that later.

## This website looks... Spartan

There's a decades old recipe for doing software development:

1. make it work,
2. make it work properly (aka "make it fast", "make it secure", etc.),
3. make it nice

We're still in phase 1.

## I want more <sup>and</sup>⧸<sub>or</sub> I have ideas

I know. [Get in touch](https://github.com/Pomax/browser-editor-tests/issues). We can do more.

- [Pomax](https://mastodon.social/deck/@TheRealPomax)
