import {
  bindCommonValues,
  verifyLogin,
  verifyAdmin,
} from "../../middleware.js";

import { loadAdminData } from "./middleware.js";

import { Router } from "express";
export const admin = Router();

admin.get(
  `/`,
  verifyLogin,
  bindCommonValues,
  verifyAdmin,
  loadAdminData,
  (req, res) => res.render(`admin.html`, { ...res.locals, ...req.session })
);
