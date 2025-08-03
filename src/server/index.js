// Load our server dependencies...
import express from "express";
import { setupRoutes } from "./routing/index.js";
import { watchForRebuild } from "./watcher.js";
import { startCaddy } from "../caddy/caddy.js";

// And our environment.
import dotenv from "dotenv";
dotenv.config();

// Then set up the server:
const app = express();
app.set("etag", false);
app.use(express.urlencoded({ extended: true }));

// Set up the render engine:
import nunjucks from "nunjucks";
nunjucks.configure("public", { autoescape: true, noCache: true, express: app });

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
