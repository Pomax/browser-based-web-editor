import { join, resolve } from "node:path";
import { readdirSync } from "node:fs";
import {
  MEMBER,
  NOT_ACTIVATED,
  OWNER,
  getAccessFor,
  getProjectListForUser,
} from "./database.js";
import { CONTENT_DIR, readContentDir } from "../helpers.js";
import { parseBodyText, parseMultiPartBody } from "./body-parsing.js";

export { parseBodyText, parseMultiPartBody };

/**
 * Send a 404
 */
export function pageNotFound(req, res) {
  if (req.query.preview) {
    res.status(404).send(`Preview not found`);
  } else {
    res.status(404).send(`${req.url} not found`);
  }
}

export async function bindUser(req, res, next = () => {}) {
  res.locals.user = req.session.passport?.user;
  next();
}

export async function verifyLogin(req, res, next) {
  const user = req.session.passport?.user;
  if (!user) {
    return next(new Error(`Not logged in`));
  }
  bindUser(req, res, next);
}

/**
 * A simple bit of middleware that confirms that someone
 * trying to do things to files (beyond loading them) is
 * in fact allowed to do that thing
 */
export function verifyEditRights(req, res, next) {
  const userName = res.locals.user.displayName;
  const projectName = res.locals.projectName;
  const accessLevel = getAccessFor(userName, projectName);
  if (accessLevel === NOT_ACTIVATED)
    return next(new Error(`Your account has not been activated yet`));
  if (accessLevel < MEMBER) return next(new Error(`Incorrect access level`));
  next();
}

export function verifyOwner(req, res, next) {
  const userName = res.locals.user.displayName;
  const projectName = res.locals.projectName;
  const accessLevel = getAccessFor(userName, projectName);
  if (accessLevel === NOT_ACTIVATED)
    return next(new Error(`Your account has not been activated yet`));
  if (accessLevel < OWNER) return next(new Error(`Incorrect access level`));
  next();
}

export function bindCommonValues(req, res, next) {
  let user = res.locals.user;
  if (!user) bindUser(req, res);
  user = res.locals.user;

  let userName, projectName, fileName;
  const { project, filename, starter } = req.params;

  if (user) {
    userName = res.locals.userName = user.displayName;
  }

  if (project) {
    projectName = res.locals.projectName = project;
  }

  if (starter) {
    res.locals.starter = starter;
  }

  if (filename) {
    const suffix = req.params[0] || ``;

    fileName = res.locals.fileName = join(
      CONTENT_DIR,
      project,
      filename + suffix
    );

    const apath = resolve(join(CONTENT_DIR, projectName));
    const bpath = resolve(fileName);
    if (!bpath.startsWith(apath)) {
      return next(new Error(`Illegal file path`));
    }
  }

  next();
}

export function loadProjectList(req, res, next) {
  // FIXME: this shouldn't blindly rebuild the list every time,
  //        creating or deleting projects should invalidate the
  //        list but otherwise we should reuse what's there.
  const { user } = res.locals;
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

export function loadStarters(req, res, next) {
  res.locals.starters = readdirSync(
    join(CONTENT_DIR, `__starter_projects`)
  ).filter((v) => !v.includes(`.`));
  next();
}
