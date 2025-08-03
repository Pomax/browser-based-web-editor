export { addMiddleware, pageNotFound, verifyOwnership };

import { getProjectListForUser } from "../database.js";

import session from "express-session";
import helmet from "helmet";
import nocache from "nocache";
import { loadProject } from "../helpers.js";
import { __dirname } from "../../constants.js";

/**
 * Send a 404
 */
function pageNotFound(req, res) {
  if (req.query.preview) {
    res.status(404).send(`Preview not found`);
  } else {
    res.status(404).send(`${req.url} not found`);
  }
}

/**
 * A simple bit of middleware that confirms that someone
 * trying to explicitly load a file from a content URL is
 * in fact the owner of that file by checking the session.
 * If it's not, it sends a response that forces the browser
 * to reload so that a new session can be negotiated.
 */
function verifyOwnership(req, res, next) {
  const url = req.url;
  if (url.startsWith(`/default/`)) {
    req.url = url.replace(/\?v=\d+/, ``);
    return next();
  }

  // FIXME: we need "real" verification based on the database here.

  next();
}

function addMiddleware(app) {
  app.use(nocache());

  // Use session management, so we can use different dirs for different projects.
  app.use(
    session({
      secret: `this shouldn't matter but here we are anyway`,
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 24 * 3600 * 1000,
      },
    })
  );

  // I hate CSP so much...
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
}

export function loadProjectList(req, res, next) {
  const { user } = req.session?.passport ?? {};
  if (user) {
    const { displayName } = user;
    const list = getProjectListForUser(displayName);
    if (list) {
      req.session.projectList = list;
      req.session.save();
    }
  }
  next();
}

export async function loadProjectData(req, res, next) {
  const name = req.query.project;
  if (name) {
    await loadProject(req, name);
    const found = req.session.projectList?.find((p) => p.name === name);
    req.session.projectOwner = !!found;
    req.session.save();
  }
  next();
}