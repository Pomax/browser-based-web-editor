import { getAllUsers, getAllProjects } from "../../../database.js";
import { getAllRunningContainers } from "../../../../docker/docker-helpers.js";

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
