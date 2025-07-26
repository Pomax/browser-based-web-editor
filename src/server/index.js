import express from "express";
import nunjucks from "nunjucks";
import {
  addMiddleware,
  pageNotFound,
  verifyOwnership,
} from "./middleware/middleware.js";
import { addGetRoutes, addPostRoutes } from "./routing/index.js";
import { watchForRebuild } from "./watcher.js";
import { startCaddy } from "./caddy.js";
import { addPassportAuth } from "./middleware/passport.js";

const PORT = process.env.PORT ?? 8000;
process.env.PORT = PORT;

const HOSTNAME = process.env.HOSTNAME ?? `localhost`;
process.env.HOSTNAME = HOSTNAME;

// Set up the core server
const app = express();
app.set("etag", false);
nunjucks.configure("public", { autoescape: true, noCache: true, express: app });

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.url}`);
  next();
});

addMiddleware(app);
addGetRoutes(app);
addPostRoutes(app);
addPassportAuth(app);

// static routes
app.use(`/`, express.static(`public`));
app.use(`/content`, verifyOwnership, express.static(`content`));
app.use(pageNotFound);

// Run the server, and trigger a client bundle rebuild every time script.js changes.
app.listen(PORT, () => {
  // Generate the server address notice
  const msg = `=   Server running on http://${HOSTNAME}:${PORT}   =`;
  const line = `=`.repeat(msg.length);
  const mid = `=${` `.repeat(msg.length - 2)}=`;
  console.log([``, line, mid, msg, mid, line, ``].join(`\n`));
  watchForRebuild();
  startCaddy();
});
