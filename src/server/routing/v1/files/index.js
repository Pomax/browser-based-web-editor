import { Router } from "express";

// "route agnostic" middleware
import {
  bindCommonValues,
  parseBodyText,
  verifyLogin,
} from "../../middleware.js";

// "file specific" middleware
import {
  getMimeType,
  loadProjectData,
  patchFile,
  verifyEditRights,
} from "./middleware.js";

export const files = Router();

/**
 *  Get the project files for populating the <file-tree>, making sure to filter
 *  out any files that should be filtered out based on the requesting user's
 *  permissions for this project (e.g. don't show the "data" dir to viewers,
 *  don't show the .env file to collaborators, don't filter for owners)
 */
files.get(
  `/dir/:project`,
  //  loadProject,
  //  loadProjectPermissions,
  bindCommonValues,
  loadProjectData,
  //  filterProjectContent, // remove any protected files so that they only show for the project owner(s)
  (_req, res) => res.json(res.locals)
);

files.get(`/:project/:filename`, bindCommonValues, getMimeType, (req, res) => {
  res.set(`Content-Type`, res.locals.mimeType);
  res.send(res.locals.data);
});

/**
 * Process a file change request: only members and owners should be able to
 * effect file changes. Regular "vieewers" should get ignored entirely.
 */
files.post(
  `/sync/:project/:filename*`,
  verifyLogin,
  bindCommonValues,
  verifyEditRights,
  parseBodyText,
  patchFile,
  (_req, res) => res.send(res.locals.fileHash)
);
