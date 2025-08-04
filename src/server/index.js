// Load our server dependencies...
import { execSync } from "node:child_process";
import express from "express";
import nocache from "nocache";
import helmet from "helmet";
import { setupRoutes } from "./routing/index.js";
import { watchForRebuild } from "./watcher.js";
import { startCaddy } from "../caddy/caddy.js";

// And our environment.
import dotenv from "dotenv";
dotenv.config({ quiet: true });

// Quick check: does docker work?
try {
  execSync(`docker ps`, { shell: true }).toString(`utf8`);
} catch (e) {
  console.error(e, `\nERROR: no Docker service is running!\n\n`);
  process.exit(1);
}

// Second quick check: does caddy work?
try {
  execSync(`caddy --version`, { shell: true }).toString(`utf8`);
} catch (e) {
  console.error(`\nERROR: Caddy does not appear to be installed!\n\n`);
  process.exit(1);
}

// Then set up the server:
const app = express();

// Set up the render engine:
import nunjucks from "nunjucks";
nunjucks.configure("public", { autoescape: true, noCache: true, express: app });

// Set the various general aspects
app.set("etag", false);
app.use(nocache());
app.use(express.urlencoded({ extended: true }));
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      connectSrc: `* data: blob: 'unsafe-inline'`,
      defaultSrc: `* data: mediastream: blob: filesystem: about: ws: wss: 'unsafe-eval' 'unsafe-inline'`,
      fontSrc: `* data: blob: 'unsafe-inline'`,
      frameAncestors: `* data: blob: 'unsafe-inline'`,
      frameSrc: `* data: blob:`,
      imgSrc: `* data: blob: 'unsafe-inline'`,
      mediaSrc: `* data: blob: 'unsafe-inline'`,
      scriptSrc: `* data: blob: 'unsafe-inline' 'unsafe-eval'`,
      scriptSrcElem: `* data: blob: 'unsafe-inline'`,
      styleSrc: `* data: blob: 'unsafe-inline'`,
    },
  })
);

// And set up everything routing related:
setupRoutes(app);

// Finally, run the server, and trigger a client bundle rebuild every time script.js changes.
const PORT = process.env.PORT ?? 8000;
app.listen(PORT, () => {
  // Generate the server address notice
  const msg = `=   Server running on https://editor.com.localhost   =`;
  const line = `=`.repeat(msg.length);
  const mid = `=${` `.repeat(msg.length - 2)}=`;
  console.log([``, line, mid, msg, mid, line, ``].join(`\n`));
  watchForRebuild();
  startCaddy();
});
