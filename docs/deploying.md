# Deploying this platform to DigitalOcean

I'm going to assume the instructions are similar on other platforms, but given that I personally deployed it to DO using a Ubuntu 20, we're using that as reference.

## Software Prerequisites

### Git

It should already be installed? But `sudo apt update` and then `sudo apt install git` should ensure you're on the latest version of `git`, too.

### Node.js

And we're obviously going to need Node.js, which I highly recommend you install [using NVM](https://first-project.webblythings.online/), and then once that's done (and you made sure to run the command to make `nvm` an active command without needing to restart), running:

```
nvm install 22
nvm alias default 22
nvm use 22
```

Done, any session should from now on default to using Node 22 (the LTS version at time of writing).

### Docker

See https://www.digitalocean.com/community/tutorials/how-to-install-and-use-docker-on-ubuntu-20-04

It's more work than it should be, but it's also not particularly complicated.

### Caddy

Oh boy. First off, we'll need to install `go`, because we're going to need to custom-build `caddy` with DO's DNS module, using `xcaddy`.

Instructions to install `go` are over on https://go.dev/doc/install (do _not_ use `apt` unless you want a five year out-of-date version).

Then: install `xcaddy`... https://github.com/caddyserver/xcaddy has solid instructions.

Then we can build `caddy` with the DO dns resolver:

```
xcaddy build --with github.com/caddy-dns/digitalocean@master
```

This will write a `caddy` executable to the dir you just ran that in, which we'll need to move to `/usr/lib`, so when that finishes:

```
sudo mv caddy /usr/bin
sudo chown root:root /usr/bin/caddy
sudo chmod 755 /usr/bin/caddy
```

We can now confirm that we've got the right "flavour" of caddy installed: `caddy list-modules` should show the digitalocean DNS module all the way at the end:

```
...
tls.leaf_cert_loader.pem
tls.leaf_cert_loader.storage
tls.permission.http
tls.stek.distributed
tls.stek.standard

  Standard modules: 127

dns.providers.digitalocean

  Non-standard modules: 1

  Unknown modules: 0
```

If so: time to move on to the next step.

### SQLite 3

Oh thank god, something we can finally just `apt install` again!

### PM2

Node is fine and all, but we're going to be running this in as a deployed production application, and we don't want an uncaught `throw` to take the entire thing down: we'll be using [pm2](https://pm2.keymetrics.io/) to make sure that if our platform errors out, or even if our droplet restarts, things just go right back to running.

```
npm i -g pm2
```


## Get some domain names!

You'll want to register two domains. In my case, I went with `webblythings.com` for the editor, and `webblythings.online` for the app hosting. These domains were then set up to point to DO's name servers, and then on the DO side, under networking -> domains, I added two A records for `@` and `make` on the .com domain, both pointing to my droplet's IP, and then also two A records for `@` and `*` on the .online domain, also pointing to my droplet's IP.

## Setting up API keys...

In order for things to work properly, you'll need to have set up a GitHub OAuth app, and you'll need to have a DigitalOcean API key.

### GitHub OAuth

Hit up https://github.com/settings/developers and create a new oauth app. As homepage you'll want `https://make.yourdomainhere.com`, and as callback URL you'll want `https://make.yourdomainhere.com/auth/github/callback`

Then, after creating the app binding, you'll need to generate a secret. Hang on to that, you'll need it during setup.

### DigitalOcean API key

Log into DO and go to https://cloud.digitalocean.com/account/api/tokens, then generate a new personal token with `domains` as the only required scope (all of them, though: caddy's going to need to be able to read and write DNS entries)

Again: hang on to that key, you'll need this one during setup, too.

## Clone the project

Standard fare:

```
cd ~
git clone https://github.com/Pomax/browser-based-web-editor.git
cd browser-based-web-editor
npm i
```

## Run the setup script

Finally, the hopefully easy part:

```
node setup
```

When asked for your domains, fill in the domains you have lined up, making sure not to include the http:// part: the setup is asking for hosts, not websites.

When asked for your github id and secret, fill those in.

When asked whether you want to set up TLS, the answer is yes. This will ask you to inpute the TLS provider, which is `digitalocean`, and your API key, which is the DigitalOcean API key you made.

## Finish up

This should run to completion and tell you to run `npm start`, which is what you do for local dev, but for production deployment we'll want to run things through `pm2` instead:

```
pm2 start "npm start"
```

Then, because we want `pm2` to autorun on droplet restart:

```
pm2 save
pm2 startup systemd
```

This may tell you that you need to run a sudo command. If so... run that =)

Then make sure pm2 is enabled as a service:

```
systemctl enable pm2-root
```

## Confirm things work!

The platform will be in "first sign in" mode, so load up the editor URL that gets printed to the console, and click the github login link. Grant permission to your app and you should end up getting redirected to the editor main page, this time with your name, and text that says you're an admin.

Congratulations, you're done!

Well, almost: go remix one of the starter projects, because you'll want to verify that your app domain works, too. For example, pick the `basic-html` project and click the remix button, which should open the editor interface with your remix's code as well as a preview on the right that's not actually a preview, but the actual website that got built for your project. Click the "new tab" button to load it on its own.

