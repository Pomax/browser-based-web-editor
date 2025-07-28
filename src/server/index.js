import express from "express";
import nunjucks from "nunjucks";
import session from "express-session";
import sqlite3 from "better-sqlite3";
import betterSQLite3Store from "better-sqlite3-session-store";
import {
  addMiddleware,
  pageNotFound,
  verifyOwnership,
} from "./middleware/middleware.js";
import { addGetRoutes, addPostRoutes } from "./routing/index.js";
import { watchForRebuild } from "./watcher.js";
import { startCaddy, stopCaddy } from "./caddy.js";
import { addPassportAuth } from "./middleware/passport.js";

const PORT = process.env.PORT ?? 8000;
process.env.PORT = PORT;

const HOSTNAME = process.env.HOSTNAME ?? `localhost`;
process.env.HOSTNAME = HOSTNAME;

// Set up the core server
const app = express();
app.set("etag", false);
nunjucks.configure("public", { autoescape: true, noCache: true, express: app });

app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.url}`);
  next();
});

const SQLite3Store = betterSQLite3Store(session);
const sessionsDB = new sqlite3("./data/sessions.sqlite3");

app.use(
  session({
    store: new SQLite3Store({
      client: sessionsDB,
      expired: {
        clear: true,
        intervalMs: 900000, //ms = 15min
      },
    }),
    secret: process.env.SESSION_SECRET,
    resave: false,
  })
);

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
  const msg = `=   Server running on https://editor.com.localhost   =`;
  const line = `=`.repeat(msg.length);
  const mid = `=${` `.repeat(msg.length - 2)}=`;
  console.log([``, line, mid, msg, mid, line, ``].join(`\n`));
  watchForRebuild();
  startCaddy();
});

process.on("SIGINT", async () => {
  stopCaddy();
  process.exit();
});
