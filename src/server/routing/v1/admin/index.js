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

admin.use(verifyLogin, bindCommonValues, verifyAdmin);

admin.get(`/`, loadAdminData, (req, res) =>
  res.render(`admin.html`, { ...res.locals, ...req.session, ...process.env })
);

admin.post(`/container/remove/:id`, deleteContainer, back);
admin.post(`/container/stop/:container`, stopContainer, back);

admin.post(`/user/delete/:uid`, deleteUser, back);
admin.post(`/user/disable/:uid`, disableUser, back);
admin.post(`/user/enable/:uid`, enableUser, back);
admin.post(`/user/suspend/:uid`, suspendUser, back);
admin.post(`/user/unsuspend/:sid`, unsuspendUser, back);

admin.post(`/project/delete/:pid`, deleteProject, back);
admin.post(`/project/suspend/:pid`, suspendProject, back);
admin.post(`/project/unsuspend/:pid`, unsuspendProject, back);
