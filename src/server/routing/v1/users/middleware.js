import * as Database from "../../../database.js";

export function getUserSettings(req, res, next) {
  const { user } = res.locals.lookups ?? {};
  res.locals.settings = Database.getUserSettings(user.id);
  next();
}
