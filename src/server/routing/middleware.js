import { join, posix, sep } from "node:path";
import { getProjectListForUser } from "./database.js";
import { CONTENT_DIR, readContentDir } from "../helpers.js";
import * as Docker from "../../docker/docker.js";
import { parseBodyText } from "./body-parsing.js";

export { parseBodyText };

export function pageNotFound(req, res) {
  if (req.query.preview) {
    res.status(404).send(`Preview not found`);
  } else {
    res.status(404).send(`${req.url} not found`);
  }
}

export function verifyLogin(req, res, next) {
  const user = req.session.passport?.user;
  if (!user) return next(new Error(`Not logged in`));
  res.locals.user = user;
  next();
}

export function bindCommonValues(req, res, next) {
  const { user } = res.locals;
  const { project, filename } = req.params;

  if (user) {
    res.locals.userName = user.displayName;
  }

  if (project) {
    res.locals.projectName = project;
  }

  if (filename) {
    res.locals.fileName = join(CONTENT_DIR, project, filename);
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

export async function loadProjectData(req, res, next) {
  const projectName = req.params.project;
  if (projectName) {
    const __dirname = `${CONTENT_DIR}${sep}${projectName}`;
    const osResponse = await readContentDir(__dirname);
    if (osResponse === false) {
      return new Error(`read dir didn't work??`);
    }
    res.locals = osResponse
      // strip out the absolute path prefix
      .map((v) => v.replace(__dirname + posix.sep, ``))
      // and filter out the .git directory
      .filter((v) => !v.startsWith(`.git`));
  }
  next();
}

export function setEditorLocals(req, res, next) {
  res.locals.projectName = req.params.project;
  next();
}

export function checkContainerHealth(req, res, next) {
  const projectName = req.params.project;
  res.locals.healthStatus = Docker.checkContainerHealth(projectName);
  next();
}
