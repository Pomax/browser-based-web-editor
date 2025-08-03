import {
  setEditorLocals,
  checkContainerHealth,
  createProject,
  loadProject,
} from "./middleware.js";

import { Router } from "express";
export const projects = Router();

/**
 * Create a project by name (using res.params.project)
 */
projects.post(`/create/:project`, createProject, loadProject, (_req, res) =>
  res.send(`ok`)
);

/**
 * Load the editor for a project. This does not necessarily mean the user
 * will be able to *actually* edit the project - that's determined by whether
 * or not they have permission to do so, when handling file operations.
 */
projects.get(`/edit/:project`, setEditorLocals, loadProject, (_req, res) =>
  res.render(`editor.html`, res.locals)
);

/**
 * Allow the client to check what state a container is for, for UI purposes.
 */
projects.get(`/health/:project`, checkContainerHealth, (_req, res) => {
  res.send(res.locals.healthStatus);
});

/**
 * Get the git log, to show all rewind points.
 */
projects.get(
  `/history/:project`,
  //  loadProjectHistory,
  (_req, res) => res.json(res.locals.history)
);
