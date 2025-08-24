# Use the web to build the web

<table border="1" cellpadding="0" cellspacing="0"><tr><td><img width="100%" src="https://github.com/user-attachments/assets/fae319b0-e39b-4369-a81e-df8cca233b57"></td><tr></table>

This is an attempt at implementing a friendly browser-based web content editor, using [codemirror 6](https://codemirror.net), a [custom-file-tree](https://github.com/pomax/custom-file-tree) as file tree component (as codemirror itself only models single editing panels), and a sprinkling of docker for runtime isolation and a reverse proxy because we like opening https URLs, and we don't like having to remember port numbers.

## How do I use this?

1. It's a node project, so you'll need that installed (I recommend `nvm` or its windows equivalent).
1. You'll also need `git` installed. Normally that goes without saying, but in this case we're also using it as an under-the-hood tool for performing version control for project content so you can't just copy this repo's source code, you _need_ `git` installed properly.
1. You'll also need docker installed, which has different instructions depending on the OS you're using.
1. And you'll want `caddy` installed, for reverse-proxying container ports so you can just load https://projectname.localhost
1. Finally, you need `sqlite3` installed. Rinse and repeat for linux or MacOs, on Windows you'll want to donwnload the `sqlite-tools-win-x64-somenumbershere.zip` from https://www.sqlite.org/download.html, create a `C:\Program Files\Sqlite3`, and unpack the zip file into that, then add that folder to your PATH (The "Docker" section below goes over how you do that for docker, just do the same for sqlite3).

With those prerequisites met:

- clone this repo (or fork it and then clone that),
- run `node setup` in the repo folder.

Once that finishes, things should be cross-platform enough to work on Windows, Mac, and Linux by running `npm start` and then opening the URL that tells you things are running on.

The main page has a login link that uses github authentication (for now). After authenticating, you're dropped into what is basically a "profile-ish" view (which I'm sure will change in the future, but we're still in the PoC phase) where you can create new projects, load up projects you've made, and delete projects you no longer care about.

Note that the first user to log in after the initial setup becomes the default admin user. Any admin user will have a link to the admin page available - that page does very little right now, but will eventually allow for tasks like enabling and (un)suspending users, (un)suspending projects, and performing container maintenance.

Also note that there are, technically, two login options, but the second is a dev-only "magic link" email login form that doesn't actually email anyone. Its only purpose is to let admins create test user accounts for messing around with. Always fun to suspend or delete test users!

## Docker?

While project _content_ lives in the content directory on your computer (or your server, etc), you don't want it to _run_ in that context. That would give it access to.. well... everything, including other project's content, the editor's code, routing configs, etc. etc. So, instead, the runtime is handled by creating a Docker container (think virtual machine) running "Alpine" Linux with Node.js and Python preinstalled, with a project's content added in as a "bind mount" (meaning the files live on the host OS, but the docker container has read/write access to them).

Projects have a special `.container` dir that houses a `run.sh` file that acts as your "what happens when your project container starts up" instruction. Also, restarting a project doesn't actually "restart" it so much as stops the container, which removes the container, then it builds a new container with the new name (which is just a fast copy of the local base image) and then run that. So be aware that any data you write outside of the project's home directory (i.e. `~/app`) is, at best, temporary. The moment the project container has to restart for whatever reason, any changes outside your project directly will be lost.

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
- Once that's done, close the command prompt, exit WSL, and quit (really quit, not close-and-minimize) Docker Desktop.
- Reopen Docker Desktop. Check the builders. F'ing magic, it worked, it'll now use linux containers just like every other OS, which is what it should have been using in the first place.

#### I already have Docker on Windows, using windows containers...

I have no advice here. This is probably not going to work for you, but if you want to try it anyway and report back, awesome!

#### How do I update docker containers if I update the codebase?

To generate a new docker base image after updating the codebase, you can run:

```
node setup --clean
```

This will leave any running containers alone, but clean up any "dead" containers based on the old image, generates a new local base image, after which any project container build to now use this new image instead.

## What's Caddy?

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

Run `node setup`. Once that's done, you're good to go and you can simply run `npm start` any time you want to run the system.

## One-time Caddy permissions

When you run the system, Caddy will set up a name binding when you switch projectsl. However, the first time you do that after having installed it, it will need your permission to add a new certificate authority to your OS's list of certificate authorities. You'll want to allow that, because otherwise localhost HTTPS won't work =)

## Edit syncing

File operations are persisted to the file system by sending diffs, with content hashing to verify that what the client has loaded, and what's on-disk on the server, are the same.

This is currently one-way, using POST operations, rather than two-way using websockets. There's nothing preventing websockets from being used, but (a) make it work first, and (b) websocket security doesn't exist, so we'd have to write a bunch of code to make all of that work well. We can do that later.

## This website looks... Spartan

There's a decades old recipe for doing software development:

1. make it work,
2. make it work properly (aka "make it fast", "make it secure", etc.),
3. make it nice

We're still in phase 1.

## What can we currently do?

As of August 18, 2025, as a visitor you can:

- load a project's "edit" route and see the code and preview. If you try to edit anything, the site will just undo your edits, because the server will have rejected them. You need to be logged in and have edit rights.

As a user you can:

- Log in with github.
- Load any project's "edit" route. You can't actually edit unless you have edit rights, but you can download the project as a .zip file (note that this will not include a project's private data dir nor .env file, of course).
- Remix projects, using the sparkle button, which creates a new copy of the public code parts with a new name "yourusername-projectname" (so you'll probably want to rename it!).
- Create, load, and edit your own projects, including editing project settings (project name, provided the new name isn't taken, description, build script, run script, and environment variables).
- Auto-format any supported file using the sparkly-eyed emoji
- Download your full project, including private data directory and .env file.
- Restart your project's container.

And as an admin you can:

- Do all the above, plus
- View the admin page, which lets you:
  - see a list of, and enable/disable, (un)suspend, and delete user accounts
  - see a list of and (un)suspend, and delete projects
  - see a list of and stop running, or delete expired containers
- Load up suspended projects in the editor (without running the project container)

## I want more <sup>and</sup>⧸<sub>or</sub> I have ideas

I know. [Get in touch](https://github.com/Pomax/browser-editor-tests/issues). We can do more.

- [Pomax](https://mastodon.social/deck/@TheRealPomax)
