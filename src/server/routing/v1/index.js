import { Router } from "express";
import { printRoutes } from "./print-routes.js";
import { projects } from "./projects/index.js";
import { files } from "./files/index.js";

export function setupRoutesV1(app) {
  const router = Router();
  router.use(`/projects`, projects);
  router.use(`/files`, files);
  app.use(`/v1`, router);

  // debuggeridoodles:
  if (true) printRoutes(app);
}
