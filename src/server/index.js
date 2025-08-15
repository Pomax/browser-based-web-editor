// Load our server dependencies...
import express from "express";
import nocache from "nocache";
import helmet from "helmet";
import { setupRoutes } from "./routing/index.js";
import { watchForRebuild } from "./watcher.js";
import { startCaddy } from "../caddy/caddy.js";

// And our environment.
import dotenv from "@dotenvx/dotenvx";
dotenv.config({ quiet: true });

// Quick check: does docker work?
try {
  await execPromise(`docker ps`);
} catch (e) {
  console.error(e, `\nERROR: no Docker service is running!\n\n`);
  process.exit(1);
}

// Second quick check: does caddy work?
try {
  await execPromise(`caddy --version`);
} catch (e) {
  console.error(`\nERROR: Caddy does not appear to be installed!\n\n`);
  process.exit(1);
}

// Then set up the server:
const app = express();

// Set up the render engine:
import nunjucks from "nunjucks";
import { execPromise } from "./helpers.js";
const nenv = nunjucks.configure("src/server/pages", {
  autoescape: true,
  noCache: true,
  express: app,
});
nenv.addFilter(`year`, (str, count) => str?.split(/[ T]/)[0]);
nenv.addFilter(`date`, (str, count) =>
  str?.replace(`T`, ` `).replace(`Z`, ``).replace(/\.\d+/, ``)
);
nenv.addFilter(`shorthash`, (str, count) => str.substring(0, 16));
nenv.addFilter(`dockerimg`, (str, count) =>
  str.startsWith(`sha256`) ? `(hash only)` : str
);

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
const { WEB_EDITOR_HOSTNAME } = process.env;
app.listen(PORT, () => {
  // Generate the server address notice
  const msg = `=   Server running on https://${WEB_EDITOR_HOSTNAME}   =`;
  const line = `=`.repeat(msg.length);
  const mid = `=${` `.repeat(msg.length - 2)}=`;
  console.log([``, line, mid, msg, mid, line, ``].join(`\n`));
  watchForRebuild();
  startCaddy();
});
