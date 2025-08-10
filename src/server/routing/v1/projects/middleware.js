import { execSync } from "node:child_process";
import { join } from "node:path";
import {
  cpSync,
  existsSync,
  mkdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";

import { CONTENT_DIR, execPromise, setupGit } from "../../../helpers.js";
import {
  runContainer,
  checkContainerHealth as dockerHealthCheck,
  renameContainer,
  restartContainer as restartDockerContainer,
  deleteContainerAndImage,
} from "../../../../docker/docker-helpers.js";
import {
  createProjectForUser,
  loadSettingsForProject,
  updateSettingsForProject,
  deleteProjectForUser,
} from "../../../database.js";
import { removeCaddyEntry } from "../../../../caddy/caddy.js";

/**
 * ...docs go here...
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
export async function createProject(req, res, next) {
  const { userName, projectName } = res.locals;
  const dir = join(CONTENT_DIR, projectName);
  const starter = `__starter_projects/${res.locals.starter || `empty`}`;
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
export function getProjectSettings(req, res, next) {
  const { projectId } = res.locals;
  res.locals.settings = loadSettingsForProject(projectId);
  next();
}

/**
 * ...docs go here...
 * @param {*} req
 * @param {*} res
 * @param {*} next
 * @returns
 */
export async function updateProjectSettings(req, res, next) {
  const { projectId, projectName, settings } = res.locals;
  const { build_script, run_script, env_vars } = settings;

  const newSettings = Object.fromEntries(
    Object.entries(req.body).map(([k, v]) => [k, v.value.trim()])
  );

  const newName = newSettings.name;
  const newDir = join(CONTENT_DIR, newSettings.name);

  if (projectName !== newName) {
    if (existsSync(newDir)) {
      return next(new Error("Cannot rename project"));
    }
  }

  try {
    updateSettingsForProject(projectId, newSettings);

    if (projectName !== newName) {
      renameSync(join(CONTENT_DIR, projectName), newDir);
      renameContainer(projectName, newName);
    }

    // Do we need to update our container files?
    let containerChange = false;
    const containerDir = join(CONTENT_DIR, projectName, `.container`);
    if (build_script !== newSettings.build_script) {
      containerChange = true;
      writeFileSync(join(containerDir, `build.sh`), newSettings.build_script);
    } else if (run_script !== newSettings.run_script) {
      containerChange = true;
      writeFileSync(join(containerDir, `run.sh`), newSettings.run_script);
    } else if (env_vars !== newSettings.env_vars) {
      containerChange = true;
      writeFileSync(join(containerDir, `.env`), newSettings.env_vars);
    }

    if (containerChange) {
      await restartDockerContainer(projectName, true);
    }

    next();
  } catch (e) {
    next(e);
  }
}

/**
 * ...docs go here...
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
export function restartContainer(req, res, next) {
  restartDockerContainer(res.locals.projectName);
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
