import { join, resolve } from "node:path";
import { readdirSync } from "node:fs";
import {
  MEMBER,
  NOT_ACTIVATED,
  OWNER,
  getAccessFor,
  getProjectListForUser,
  getNameForProjectId,
  getIdForProjectName,
  processUserLogin,
  getUserAdminFlag,
  hasAccessToUserRecords,
  getAllUsers,
  getAllProjects,
} from "../database.js";
import { getAllRunningContainers } from "../../docker/docker-helpers.js";
import { CONTENT_DIR } from "../helpers.js";
import { parseBodyText, parseMultiPartBody } from "./body-parsing.js";

export { parseBodyText, parseMultiPartBody };

// For when you really don't want response caching.
export function nocache(req, res, next) {
  res.setHeader("Surrogate-Control", "no-store");
  res.setHeader(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate"
  );
  res.setHeader("Expires", "0");
  next();
}

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
  const { user } = req.session.passport ?? {};
  if (user) {
    res.locals.user = processUserLogin(user);
  }
  next();
}

export async function verifyLogin(req, res, next) {
  const user = req.session.passport?.user;
  if (!user) {
    return next(new Error(`Not logged in`));
  }
  bindUser(req, res, next);
}

export function verifyAdmin(req, res, next) {
  const { userName } = res.locals;
  if (getUserAdminFlag(userName)) {
    next();
  } else {
    next(new Error(`You're not an admin`));
  }
}

export function verifyAccesToUser(req, res, next) {
  const { userId: sessionUserId } = res.locals;
  const { userId: lookupUserId } = res.locals.lookups ?? {};
  if (!lookupUserId) return next(new Error(`No such user`));
  if (hasAccessToUserRecords(sessionUserId, lookupUserId)) {
    next();
  } else {
    next(new Error(`Access denied`));
  }
}

export function verifyEditRights(req, res, next) {
  const { userName, projectName } = res.locals;
  const accessLevel = getAccessFor(userName, projectName);
  if (accessLevel === NOT_ACTIVATED)
    return next(new Error(`Your account has not been activated yet`));
  if (accessLevel < MEMBER) return next(new Error(`Incorrect access level`));
  next();
}

export function verifyOwner(req, res, next) {
  const { userName, projectName } = res.locals;
  const accessLevel = getAccessFor(userName, projectName);
  if (accessLevel === NOT_ACTIVATED)
    return next(new Error(`Your account has not been activated yet`));
  if (accessLevel < OWNER) return next(new Error(`Incorrect access level`));
  next();
}

export function bindCommonValues(req, res, next) {
  bindUser(req, res);
  const { user } = res.locals;

  let userName, userId, projectName, projectId, fileName;
  const { uid, project, pid, filename, starter } = req.params;

  if (user) {
    userName = res.locals.userName = user.name;
    userId = res.locals.userId = user.id;
  }

  if (uid) {
    res.locals.lookups ??= {};
    res.locals.lookups.userId = parseInt(uid, 10);
  }

  if (pid) {
    projectId = res.locals.projectId = parseInt(pid, 10);
  }

  if (project) {
    projectName = res.locals.projectName = project;
  } else if (projectId) {
    try {
      projectName = res.locals.projectName = getNameForProjectId(projectId);
    } catch (e) {}
  }

  if (!projectId && projectName) {
    try {
      projectId = res.locals.projectId = getIdForProjectName(projectName);
    } catch (e) {}
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
    const list = getProjectListForUser(user.name);
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

export function loadAdminData(req, res, next) {
  // TODO: obviously this does not scale to thousands of users and projects,
  //       but this codebase is not designed for that scale. For large scale
  //       this would have to be an API call for the various "streams" with
  //       the admin interface simply building UI with search and pagination.
  res.locals.admin = {
    userList: getAllUsers(),
    projectList: getAllProjects(),
    containerList: getAllRunningContainers(),
  };
  next();
}
