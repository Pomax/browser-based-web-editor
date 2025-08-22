import * as Database from "../../../database.js";
import * as Docker from "../../../../docker/docker-helpers.js";
import * as ProjectRoutes from "../projects/middleware.js";

export function back(req, res) {
  res.redirect(`/v1/admin`);
}

export function loadAdminData(req, res, next) {
  // TODO: obviously this does not scale to thousands of users and projects,
  //       but this codebase is not designed for that scale. For large scale
  //       this would have to be an API call for the various "streams" with
  //       the admin interface simply building UI with search and pagination.
  res.locals.admin = {
    userList: Database.getAllUsers(),
    projectList: Database.getAllProjects(),
    containerList: Docker.getAllRunningContainers(),
  };
  next();
}

// Container related routes

export function deleteContainer(req, res, next) {
  const id = req.params.id;
  console.log(`deleteContainer(${id})`);
  Docker.deleteContainer(id);
  next();
}

export function stopContainer(req, res, next) {
  const c = req.params.container.replace(`sha256:`, ``);
  Docker.stopContainer(c);
  next();
}

// User related routes

export function deleteUser(req, res, next) {
  Database.deleteUser(res.locals.lookups.userId);
  next();
}

export function disableUser(req, res, next) {
  Database.disableUser(res.locals.lookups.userId);
  next();
}

export function enableUser(req, res, next) {
  Database.enableUser(res.locals.lookups.userId);
  next();
}

export function suspendUser(req, res, next) {
  Database.suspendUser(res.locals.lookups.userId, req.body.reason);
  next();
}

export function unsuspendUser(req, res, next) {
  uDatabase.nsuspendUser(parseInt(req.params.sid, 10));
  next();
}

// Project related routes

export function deleteProject(req, res, next) {
  ProjectRoutes.deleteProject(req, res, next);
}

export function suspendProject(req, res, next) {
  Database.suspendProject(res.locals.projectId, req.body.reason);
  next();
}

export function unsuspendProject(req, res, next) {
  unsuspendProject(res.locals.projectId);
  next();
}
