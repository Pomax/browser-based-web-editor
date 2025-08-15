import {
  bindCommonValues,
  verifyLogin,
  verifyAdmin,
} from "../../middleware.js";

import {
  stopContainer,
  deleteContainer,
} from "../../../../docker/docker-helpers.js";

import { loadAdminData } from "./middleware.js";

import { Router } from "express";
import {
  deleteUser,
  enableUser,
  disableUser,
  suspendUser,
  unsuspendUser,
} from "../../../database.js";
export const admin = Router();

const prechecks = [verifyLogin, bindCommonValues, verifyAdmin];

admin.get(`/`, ...prechecks, loadAdminData, (req, res) =>
  res.render(`admin.html`, { ...res.locals, ...req.session, ...process.env })
);

admin.post(
  `/container/stop/:container`,
  ...prechecks,
  (req, res, next) => {
    const c = req.params.container.replace(`sha256:`, ``);
    console.log(`stopContainer(${c})`);
    stopContainer(c);
    next();
  },
  (req, res) => res.send(`ok`)
);

admin.post(
  `/container/remove/:id`,
  ...prechecks,
  (req, res, next) => {
    const id = req.params.id;
    console.log(`deleteContainer(${id})`);
    deleteContainer(id);
    next();
  },
  (req, res) => res.send(`ok`)
);

admin.post(
  `/user/delete/:uid`,
  ...prechecks,
  (req, res, next) => {
    deleteUser(res.locals.lookups.userId);
    next();
  },
  (req, res) => res.redirect(`/v1/admin`)
);

admin.post(
  `/user/disable/:uid`,
  ...prechecks,
  (req, res, next) => {
    disableUser(res.locals.lookups.userId);
    next();
  },
  (req, res) => res.redirect(`/v1/admin`)
);

admin.post(
  `/user/enable/:uid`,
  ...prechecks,
  (req, res, next) => {
    enableUser(res.locals.lookups.userId);
    next();
  },
  (req, res) => res.redirect(`/v1/admin`)
);

admin.post(
  `/user/suspend/:uid`,
  ...prechecks,
  (req, res, next) => {
    suspendUser(res.locals.lookups.userId, req.body.reason);
    next();
  },
  (req, res) => res.redirect(`/v1/admin`)
);

admin.post(
  `/user/unsuspend/:sid`,
  ...prechecks,
  (req, res, next) => {
    unsuspendUser(parseInt(req.params.sid, 10));
    next();
  },
  (req, res) => res.redirect(`/v1/admin`)
);
