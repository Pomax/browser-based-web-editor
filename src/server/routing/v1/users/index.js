import {
  bindCommonValues,
  verifyLogin,
  verifyAccesToUser,
  parseBodyText,
} from "../../middleware.js";
import { getUserSettings } from "../../../database.js";

import { Router } from "express";
export const users = Router();

users.get(
  `/settings/:uid`,
  verifyLogin,
  bindCommonValues,
  verifyAccesToUser,
  // TODO: this goes in the middleware file
  (req, res, next) => {
    const { userId} = res.locals.lookups ?? {};
    res.locals.settings = getUserSettings(userId);
    next();
  },
  (_req, res) => res.json(res.locals.settings)
);

// TODO: fix this? Do we want users to be able to change their display name?
users.post(
  `/settings/:uid`,
  verifyLogin,
  bindCommonValues,
  verifyAccesToUser,
  parseBodyText,
  (req, res, next) => {
    console.log(req.body);
    next();
  },
  (_req, res) => res.send(`ok`)
);
