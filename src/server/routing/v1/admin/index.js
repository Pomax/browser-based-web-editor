import {
  bindCommonValues,
  verifyLogin,
  verifyAdmin,
} from "../../middleware.js";

import {
  back,
  loadAdminData,
  deleteContainer,
  stopContainer,
  deleteUser,
  disableUser,
  enableUser,
  suspendUser,
  unsuspendUser,
  deleteProject,
  suspendProject,
  unsuspendProject,
} from "./middleware.js";

import { Router } from "express";
export const admin = Router();

const prechecks = [verifyLogin, bindCommonValues, verifyAdmin];

admin.get(`/`, ...prechecks, loadAdminData, (req, res) =>
  res.render(`admin.html`, { ...res.locals, ...req.session, ...process.env })
);

admin.post(`/container/remove/:id`, ...prechecks, deleteContainer, back);
admin.post(`/container/stop/:id`, ...prechecks, stopContainer, back);

admin.post(`/user/delete/:uid`, ...prechecks, deleteUser, back);
admin.post(`/user/disable/:uid`, ...prechecks, disableUser, back);
admin.post(`/user/enable/:uid`, ...prechecks, enableUser, back);
admin.post(`/user/suspend/:uid`, ...prechecks, suspendUser, back);
admin.post(`/user/unsuspend/:sid`, ...prechecks, unsuspendUser, back);

admin.post(`/project/delete/:pid`, ...prechecks, deleteProject, back);
admin.post(`/project/suspend/:pid`, ...prechecks, suspendProject, back);
admin.post(`/project/unsuspend/:sid`, ...prechecks, unsuspendProject, back);
