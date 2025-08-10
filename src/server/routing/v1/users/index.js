import { Router } from "express";

export const users = Router();

users.get(
  // We want the signup route to create a user record that
  // we can then tie the chosen initial oauth method to.
  `/signup`,
  (_req, res) => res.send(`ok`)
);
