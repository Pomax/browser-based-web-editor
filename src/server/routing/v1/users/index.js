import {
  bindCommonValues,
  verifyLogin,
  verifyAccesToUser,
} from "../../middleware.js";
import { getUserSettings } from "../../../database.js";

import { Router } from "express";
export const users = Router();

users.get(
  `/settings/:uid`,
  verifyLogin,
  bindCommonValues,
  verifyAccesToUser,
  (req, res, next) => {
    // TODO: this goes in the middleware file
    const { userId } = res.locals.lookups ?? {};
    res.locals.settings = getUserSettings(userId);
    next();
  },
  (_req, res) => res.json(res.locals.settings)
);
