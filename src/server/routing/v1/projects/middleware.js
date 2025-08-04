import { execSync } from "node:child_process";
import { join } from "node:path";
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";

import { CONTENT_DIR, execPromise, setupGit } from "../../../helpers.js";
import {
  runContainer,
  checkContainerHealth as dockerHealthCheck,
  deleteContainerAndImage,
} from "../../../../docker/docker.js";
import { createProjectForUser, deleteProjectForUser } from "../../database.js";
import { removeCaddyEntry } from "../../../../caddy/caddy.js";

/**
 * ...docs go here...
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
export async function loadProject(req, res, next) {
  const { projectName } = res.locals;
  const dir = join(CONTENT_DIR, projectName);

  if (!existsSync(dir)) throw new Error(`No such project`);

  // ensure there's a git dir
  if (!existsSync(`${dir}/.git`)) {
    console.log(`adding git tracking for ${dir}`);
    execSync(`cd ${dir} && git init && cd ..`);
  }

  // ensure git knows who we are.
  setupGit(dir, projectName);

  // Then get a container running
  await runContainer(projectName);

  next();
}

/**
 * ...docs go here...
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
export function checkContainerHealth(req, res, next) {
  res.locals.healthStatus = dockerHealthCheck(req.locals.projectName);
  next();
}

/**
 * ...docs go here...
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
export async function loadProjectHistory(req, res, next) {
  const { projectName } = res.locals;
  const cmd = `git log  --no-abbrev-commit --pretty=format:"%H%x09%ad%x09%s"`;
  const output = await execPromise(cmd, {
    cwd: join(CONTENT_DIR, projectName),
  });
  const parsed = output.split(`\n`).map((line) => {
    let [hash, timestamp, reason] = line.split(`\t`).map((e) => e.trim());
    reason = reason.replace(/^['"]?/, ``).replace(/['"]?$/, ``);
    return { hash, timestamp, reason };
  });
  res.locals.history = parsed;
  next();
}

/**
 * ...docs go here...
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
export async function createProject(req, res, next) {
  const { userName, projectName } = res.locals;
  const dir = join(CONTENT_DIR, projectName);
  const starter = `__starter_projects/${req.params.starter || `web-graphics`}`;
  if (!existsSync(dir)) {
    mkdirSync(dir);
    cpSync(dir.replace(projectName, starter), dir, { recursive: true });
  }
  createProjectForUser(userName, projectName);
  next();
}

/**
 * ...docs go here...
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
export async function deleteProject(req, res, next) {
  const { userName, projectName } = res.locals;
  deleteProjectForUser(userName, projectName);

  console.log(`Cleaning up Caddyfile`);
  removeCaddyEntry(projectName);

  console.log(`Cleaning up ${projectName} container and image`);
  deleteContainerAndImage(projectName);

  console.log(`Removing ${projectName} from the filesystem`);
  rmSync(`${CONTENT_DIR}/${projectName}`, {
    recursive: true,
    force: true,
  });

  next();
}
