import {
  bindCommonValues,
  verifyLogin,
  verifyEditRights,
  verifyOwner,
  parseMultiPartBody,
} from "../../middleware.js";

import {
  checkContainerHealth,
  getProjectSettings,
  updateProjectSettings,
  restartContainer,
  createProject,
  deleteProject,
  loadProject,
  loadProjectHistory,
} from "./middleware.js";

import { Router } from "express";
export const projects = Router();

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
  (_req, res) => res.render(`editor.html`, res.locals)
);

/**
 * Create a project by name (using res.params.project)
 */
projects.post(
  `/create/:starter/:project`,
  verifyLogin,
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
  (_req, res) => res.send(`ok`)
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
