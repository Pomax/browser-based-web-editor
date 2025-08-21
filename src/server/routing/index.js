import express from "express";
import session from "express-session";
import sqlite3 from "better-sqlite3";
import betterSQLite3Store from "better-sqlite3-session-store";
import {
  bindCommonValues,
  loadProjectList,
  loadStarters,
  pageNotFound,
} from "./middleware.js";
import { addPassportAuth } from "./auth/index.js";
import { setupRoutesV1 } from "./v1/index.js";

const FIFTEEN_MINUTES_IN_MS = 15 * 60 * 1000;

function log(req, _res, next) {
  const time = new Date()
    .toISOString()
    .replace(`T`, ` `)
    .replace(`Z`, ``)
    .replace(/\.\d+$/, ``);
  console.log(`${req.method} [${time}] ${req.url}`);
  next();
}

function errorHandler(err, req, res, next) {
  // TODO: we can do more here... maybe
  res.status(500).send(err.message);
}

export function setupRoutes(app) {
  // Add some poor man's logging
  app.use(log);

  // basic session properties, with sqlite store
  const SQLite3Store = betterSQLite3Store(session);
  const sessionsDB = new sqlite3("./data/sessions.sqlite3");
  app.use(
    session({
      resave: false,
      saveUninitialized: false,
      secret: process.env.SESSION_SECRET,
      store: new SQLite3Store({
        client: sessionsDB,
        expired: {
          clear: true,
          intervalMs: FIFTEEN_MINUTES_IN_MS,
        },
      }),
    })
  );

  // passport-mediated login routes
  addPassportAuth(app);

  // all our other routes!
  setupRoutesV1(app);

  // ...and the main page
  app.get(`/`, bindCommonValues, loadProjectList, loadStarters, (req, res) =>
    res.render(`main.html`, { ...res.locals, ...req.session, ...process.env })
  );

  // static routes for the website itself
  app.use(`/`, express.static(`public`, { etag: false }));
  app.use(`/default`, express.static(`content/default`, { etag: false }));

  // What do we do with a 404?
  app.use(pageNotFound);

  // And terminal error handling.
  app.use(errorHandler);
}
