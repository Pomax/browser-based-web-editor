import { unlinkSync } from "node:fs";
import {
  bindCommonValues,
  parseMultiPartBody,
  verifyEditRights,
  verifyLogin,
  verifyOwner,
} from "../../middleware.js";

import {
  checkContainerHealth,
  createProject,
  createProjectDownload,
  deleteProject,
  getProjectSettings,
  loadProject,
  loadProjectHistory,
  remixProject,
  restartContainer,
  routeWithoutProject,
  updateProjectSettings,
} from "./middleware.js";

import { getDirListing } from "../files/middleware.js";

import { Router } from "express";
export const projects = Router();

/**
 * Create a project by name (using res.params.project)
 */
projects.post(
  // OBSOLETE ROUTE, ONLY HERE UNTIL THE CODE HAS BEEN SWITCHED
  // OVER TO REMIXING STARTERS INSTEAD OF "CREATING FROM"
  `/create/:starter/:project`,
  verifyLogin,
  routeWithoutProject,
  bindCommonValues,
  createProject,
  loadProject,
  (_req, res) => res.send(`ok`)
);

/**
 * Delete a project by name
 */
projects.post(
  `/delete/:project`,
  verifyLogin,
  bindCommonValues,
  verifyOwner,
  deleteProject,
  (_req, res) => res.send(`ok`)
);

/**
 * Download a project. Doesn't even need to be your own!
 */
projects.get(
  `/download/:project`,
  verifyLogin,
  bindCommonValues,
  getDirListing,
  createProjectDownload,
  (req, res) =>
    res.sendFile(res.locals.zipFile, () => {
      unlinkSync(res.locals.zipFile);
    })
);

/**
 * Load the editor for a project. This does not necessarily mean the user
 * will be able to *actually* edit the project - that's determined by whether
 * or not they have permission to do so, when handling file operations.
 */
projects.get(
  // This is the editor.html route
  `/edit/:project`,
  bindCommonValues,
  loadProject,
  (req, res) =>
    res.render(`editor.html`, { ...res.locals, ...req.session, ...process.env })
);

/**
 * Allow the client to check what state a container is for, for UI purposes.
 */
projects.get(
  `/health/:project`,
  verifyLogin,
  bindCommonValues,
  checkContainerHealth,
  (_req, res) => {
    res.send(res.locals.healthStatus);
  }
);

/**
 * Get the git log, to show all rewind points.
 */
projects.get(
  `/history/:project`,
  verifyLogin,
  bindCommonValues,
  verifyEditRights,
  loadProjectHistory,
  (_req, res) => res.json(res.locals.history)
);

/**
 * Allow the client to check project settings.
 */
projects.get(
  `/settings/:pid`,
  verifyLogin,
  bindCommonValues,
  getProjectSettings,
  (_req, res) => res.json(res.locals.settings)
);

/**
 * Update a project's settings
 */
projects.post(
  `/settings/:pid`,
  verifyLogin,
  bindCommonValues,
  verifyOwner,
  parseMultiPartBody,
  getProjectSettings,
  updateProjectSettings,
  (_req, res) => res.send(`/v1/projects/edit/${res.locals.projectName}`)
);

/**
 * Remix a project
 */
projects.get(
  `/remix/:project`,
  verifyLogin,
  bindCommonValues,
  remixProject,
  (req, res) => res.redirect(`/v1/projects/edit/${res.locals.newProjectName}`)
);

/**
 * restart a project container
 */
projects.post(
  `/restart/:project`,
  verifyLogin,
  bindCommonValues,
  verifyOwner,
  restartContainer,
  (_req, res) => res.send(`ok`)
);
