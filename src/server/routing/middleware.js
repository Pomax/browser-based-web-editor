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
  getUser,
  getUserSuspensions,
  getUserAdminFlag,
  hasAccessToUserRecords,
} from "../database.js";
import { CONTENT_DIR } from "../helpers.js";

/**
 * For when you really don't want response caching.
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
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
 * @param {*} req
 * @param {*} res
 */
export function pageNotFound(req, res) {
  if (req.query.preview) {
    res.status(404).send(`Preview not found`);
  } else {
    res.status(404).send(`${req.url} not found`);
  }
}

/**
 * ...docs go here...
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
export async function bindUser(req, res, next = () => {}) {
  const { user } = req.session.passport || {};
  res.locals.user = user;
  next();
}

/**
 * ...docs go here...
 * @param {*} req
 * @param {*} res
 * @param {*} next
 * @returns
 */
export async function verifyLogin(req, res, next) {
  const user = req.session.passport?.user;
  if (!user) {
    return next(new Error(`Not logged in`));
  }
  const u = getUser(user.id);
  if (!u.enabled_at) {
    return next(new Error(`This user account has not been actived yet`));
  }
  const suspensions = getUserSuspensions(u.id);
  if (suspensions.length) {
    return next(
      new Error(
        `This user account has been suspended (${suspensions.map((s) => `"${s.reason}"`).join(`, `)})`
      )
    );
  }
  bindUser(req, res, next);
}

/**
 * ...docs go here...
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
export function verifyAdmin(req, res, next) {
  const { userName } = res.locals;
  if (getUserAdminFlag(userName)) {
    next();
  } else {
    next(new Error(`You're not an admin`));
  }
}

/**
 * ...docs go here...
 * @param {*} req
 * @param {*} res
 * @param {*} next
 * @returns
 */
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

/**
 * ...docs go here...
 * @param {*} req
 * @param {*} res
 * @param {*} next
 * @returns
 */
export function verifyEditRights(req, res, next) {
  const { userName, projectName } = res.locals;
  const accessLevel = getAccessFor(userName, projectName);
  if (accessLevel === NOT_ACTIVATED)
    return next(new Error(`Your account has not been activated yet`));
  if (accessLevel < MEMBER) return next(new Error(`Incorrect access level`));
  next();
}

/**
 * ...docs go here...
 * @param {*} req
 * @param {*} res
 * @param {*} next
 * @returns
 */
export function verifyOwner(req, res, next) {
  const { userName, projectName } = res.locals;
  const accessLevel = getAccessFor(userName, projectName);
  if (accessLevel === NOT_ACTIVATED)
    return next(new Error(`Your account has not been activated yet`));
  if (accessLevel < OWNER) return next(new Error(`Incorrect access level`));
  next();
}

/**
 * ...docs go here...
 * @param {*} req
 * @param {*} res
 * @param {*} next
 * @returns
 */
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

/**
 * ...docs go here...
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
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

/**
 * ...docs go here...
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
export function loadStarters(req, res, next) {
  res.locals.starters = readdirSync(
    join(CONTENT_DIR, `__starter_projects`)
  ).filter((v) => !v.includes(`.`));
  next();
}

/**
 * ...docs go here...
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
export async function parseBodyText(req, res, next) {
  let chunks = [];
  req.on("data", (chunk) => chunks.push(chunk));
  req.on("end", () => {
    req.body = Buffer.concat(chunks).toString(`utf-8`);
    next();
  });
}

function getDelimiter(req) {
  const ctt = req.header(`content-type`);
  if (!ctt.includes(`multipart/form-data`))
    throw new Error(`Not multipart/form-data.`);
  const boundary = ctt.match(/boundary=([^\s;]+)/)?.[1];
  if (!boundary) throw new Error(`No boundary found.`);
  return `--${boundary}\r\n`;
}

/**
 * ...docs go here...
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
export async function parseMultiPartBody(req, res, next) {
  const delimiter = getDelimiter(req);
  const endMarker = delimiter.replace(`\r\n`, ``) + `--`;

  const data = await (() => {
    let chunks = [];
    return new Promise((resolve, reject) => {
      req.on("data", (chunk) => chunks.push(chunk));
      req.on("end", () => resolve(Buffer.concat(chunks)));
      req.on("error", () => reject());
    });
  })();

  const parts = [];
  const flatString = [...data].map((v) => String.fromCharCode(v)).join(``); // woo this isn't inefficient at all!
  const blocks = flatString.split(delimiter);
  const HEADER = Symbol(`MULTIPART/FORM PART HEADER`);
  const CONTENT = Symbol(`MULTIPART/FORM PART CONTENT`);

  blocks.forEach((block, i) => {
    if (block.length === 0) return;

    const part = {
      name: `none`,
      type: `text/plain`,
      value: ``,
      encoding: `utf-8`,
    };

    parts.push(part);

    let parseMode = HEADER;

    do {
      if (parseMode === HEADER) {
        const cut = block.indexOf(`\r\n`) + 2;
        let line = block.substring(0, cut);
        block = block.substring(cut);

        if (line.includes(`Content-Disposition`)) {
          const name = line.match(/name="([^"]+)"/)?.[1];
          if (!name)
            throw new Error(`Content-Disposition is missing field name!`);
          part.name = name;
          const filename = line.match(/filename="([^"]+)"/)?.[1];
          if (filename) {
            part.filename = filename;
          }
        } else if (line.includes(`Content-Type`)) {
          const ctt = line.match(/Content-Type: ([^\s;]+)/)?.[1];
          if (ctt) {
            part.type = ctt;
          }
        } else if (line.includes(`Content-Transfer-Encoding`)) {
          const cte = line.match(/Content-Transfer-Encoding: ([^\s;]+)/)?.[1];
          if (cte) {
            part.encoding = cte;
          }
        } else if (line === `\r\n`) {
          parseMode = CONTENT;
        }
      } else if (parseMode === CONTENT) {
        // Either this is the last block and the data ends in the end marker,
        let cut = block.indexOf(endMarker) - 2;
        // or it's not, and the block ends in \r\n
        if (cut < 0) cut = block.length - 2;
        part.value = block.substring(0, cut);
        break;
      }
    } while (block.length);
  });

  req.body ??= {};
  parts.forEach((part) => (req.body[part.name] = part));
  next();
}
