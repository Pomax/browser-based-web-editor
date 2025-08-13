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
export const admin = Router();

const prechecks = [verifyLogin, bindCommonValues, verifyAdmin];

admin.get(`/`, ...prechecks, loadAdminData, (req, res) =>
  res.render(`admin.html`, { ...res.locals, ...req.session })
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
