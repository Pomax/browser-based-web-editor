import express from "express";
import session from "express-session";
import sqlite3 from "better-sqlite3";
import betterSQLite3Store from "better-sqlite3-session-store";
import { pageNotFound, loadProjectList } from "./middleware.js";
import { addPassportAuth } from "./passport.js";
import { setupRoutesV1 } from "./v1/index.js";

const FIFTEEN_MINUTES_IN_MS = 15 * 60 * 1000;

export function setupRoutes(app) {
  // Add some poor man's logging
  app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.url}`);
    next();
  });

  // basic session properties, with sqlite store
  const SQLite3Store = betterSQLite3Store(session);
  const sessionsDB = new sqlite3("./data/sessions.sqlite3");
  app.use(
    session({
      store: new SQLite3Store({
        client: sessionsDB,
        expired: {
          clear: true,
          intervalMs: FIFTEEN_MINUTES_IN_MS,
        },
      }),
      secret: process.env.SESSION_SECRET,
      resave: false,
    })
  );

  // passport-mediated login routes
  addPassportAuth(app);

  // all our other routes!
  setupRoutesV1(app);

  // ...except for the main page
  app.get(`/`, loadProjectList, (req, res) =>
    res.render(`main.html`, req.session)
  );

  // static routes for the website itself
  app.use(`/`, express.static(`public`, { etag: false }));  
  app.use(`/default`, express.static(`content/default`, { etag: false }));

  // What do we do with a 404?
  app.use(pageNotFound);
}
