import mime from "mime";
import { readFileSync, writeFileSync } from "node:fs";
import { getAccessFor, OWNER, EDITOR, MEMBER } from "../../database.js";
import {
  CONTENT_DIR,
  createRewindPoint,
  getFileSum,
} from "../../../helpers.js";
import { applyPatch } from "../../../../../public/vendor/diff.js";

import { loadProjectData } from "../../middleware.js";
export { loadProjectData }; // TODO: move file related middleware here

export function verifyEditRights(req, res, next) {
  const userName = res.locals.user.displayName;
  const projectName = res.locals.projectName;
  const accessLevel = getAccessFor(userName, projectName);
  if (accessLevel < MEMBER) return next(new Error(`Incorrect access level`));
  next();
}

export function getMimeType(req, res, next) {
  const { fileName } = res.locals;
  const mimeType = mime.getType(fileName);
  res.locals = {
    mimeType,
    data: readFileSync(fileName),
  };
  next();
}

export function patchFile(req, res, next) {
  const { projectName, fileName } = res.locals;
  let data = readFileSync(fileName).toString(`utf8`);
  const patch = req.body;
  const patched = applyPatch(data, patch);
  if (patched) writeFileSync(fileName, patched);
  res.locals.fileHash = `${getFileSum(projectName, fileName, true)}`;
  createRewindPoint(res.locals.projectName);
  next();
}
