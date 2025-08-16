import { execSync } from "node:child_process";
import { join, resolve } from "node:path";
import {
  cpSync,
  createReadStream,
  createWriteStream,
  existsSync,
  lstat,
  lstatSync,
  mkdirSync,
  renameSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import archiver from "archiver";

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
  getAccessFor,
  MEMBER,
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
  cloneProject(res.locals.starter, projectName);
  createProjectForUser(userName, projectName);
  next();
}

/**
 * ...docs go here...
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
export async function remixProject(req, res, next) {
  const { projectName, userName } = res.locals;
  const newProjectName = (res.locals.newProjectName =
    `${projectName}-for-${userName}`.toLocaleLowerCase());
  cloneProject(projectName, newProjectName, false);
  try {
    createProjectForUser(userName, newProjectName);
  } catch (e) {}
  next();
}

/**
 * ...docs go here...
 * @param {*} source
 * @param {*} projectName
 * @param {*} isStarter
 */
function cloneProject(source, projectName, isStarter = true) {
  const dir = join(CONTENT_DIR, projectName);
  if (isStarter) {
    source = `__starter_projects/${source || `empty`}`;
  }
  if (!existsSync(dir)) {
    mkdirSync(dir);
    cpSync(dir.replace(projectName, source), dir, { recursive: true });
    try {
      unlinkSync(join(dir, `.git`), { recursive: true });
    } catch (e) {
      // this can't fail.
    }
    try {
      unlinkSync(join(dir, `.container`, `.env`));
    } catch (e) {
      // we don't care if .env didn't exist =)
    }
    try {
      unlinkSync(join(dir, `.data`), { recursive: true });
    } catch (e) {
      // we also don't care if there was no .data dir
    }
  }
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

  if (!existsSync(dir)) return next(new Error(`No such project`));

  // ensure there's a git dir
  if (!existsSync(`${dir}/.git`)) {
    console.log(`adding git tracking for ${dir}`);
    execSync(`cd ${dir} && git init && cd ..`);
  }

  // ensure git knows who we are.
  setupGit(dir, projectName);

  // Then get a container running
  await runContainer(projectName);

  // is this a logged in user?
  if (res.locals.user) {
    // if this their project?
    const a = getAccessFor(res.locals.user.name, projectName);
    if (a >= MEMBER) {
      res.locals.projectMember = true;
    }
  }

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
      console.log(`rebinding res.locals.projectName to ${newName}`);
      res.locals.projectName = newName;
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

export async function createProjectDownload(req, res, next) {
  const { projectName, dir } = res.locals;
  const zipDir = resolve(join(CONTENT_DIR, `__archives`));
  if (!existsSync(zipDir)) mkdirSync(zipDir);
  const dest = resolve(zipDir, projectName) + `.zip`;
  res.locals.zipFile = dest;

  const output = createWriteStream(dest);
  const archive = archiver("zip", { zlib: { level: 9 } });
  archive.pipe(output);

  output.on("close", () => next());
  archive.on("error", (err) => next(err));

  // Additional "these should never be in a zip file"
  const prefixes = [`node_modules/`];

  dir.forEach((file) => {
    if (prefixes.some((p) => file.startsWith(p))) return;
    const path = resolve(CONTENT_DIR, projectName, file);
    if (lstatSync(path).isDirectory()) return;
    // console.log(file);
    const stream = createReadStream(path);
    archive.append(stream, { name: `${projectName}/${file}` });
  });

  // console.log(`finalizing ${projectName}.zip`)
  archive.finalize();
}
