// exports first, so it's easier for someone to see what's on offer.
// And this works because functions get hoisted at parse-time.
export {
  createRewindPoint,
  execPromise,
  getFileSum,
  readContentDir,
  setupGit,
  loadProject,
};

import { cpSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { join, sep, posix } from "node:path";
import { exec, execSync } from "node:child_process";
import { runContainer } from "../docker/docker.js";
import { isWindows } from "./utils.js";
import { createProjectForUser } from "./routing/database.js";

// Set up the vars we need for pointing to the right dirs
export const CONTENT_BASE = process.env.CONTENT_BASE ?? `content`;
process.env.CONTENT_BASE = CONTENT_BASE;

export const CONTENT_DIR = isWindows ? CONTENT_BASE : `./${CONTENT_BASE}`;
process.env.CONTENT_DIR = CONTENT_DIR;

// Set up the things we need for scheduling git commits when
// content changes, or the user requests an explicit rewind point:
const COMMIT_TIMEOUT_MS = 5_000;

// We can't save timeouts to req.session so we need a separate tracker
const COMMIT_TIMEOUTS = {};

/**
 * Schedule a git commit to capture all changes since the last time we did that.
 * @param {*} projectName
 * @param {*} reason
 */
function createRewindPoint(projectName, reason) {
  console.log(`scheduling rewind point`);

  const now = new Date()
    .toISOString()
    .replace(`T`, ` `)
    .replace(`Z`, ``)
    .replace(/\.\d+/, ``);
  reason = reason || `Autosave (${now})`;

  const dir = `${CONTENT_DIR}/${projectName}`;
  const debounce = COMMIT_TIMEOUTS[projectName];

  if (debounce) clearTimeout(debounce);

  COMMIT_TIMEOUTS[projectName] = setTimeout(async () => {
    console.log(`creating rewind point`);
    const cmd = `cd ${dir} && git add . && git commit --allow-empty -m "${reason}"`;
    console.log(`running:`, cmd);
    try {
      await execPromise(cmd);
    } catch (e) {
      console.error(e);
    }
    COMMIT_TIMEOUTS[projectName] = undefined;
  }, COMMIT_TIMEOUT_MS);
}

/**
 * Create a super simple hash digest by summing all bytes in the file.
 * We don't need cryptographically secure, we're just need it to tell
 * whether a file on-disk and the same file in the browser differ, and
 * if they're not, the browser simply redownloads the file.
 */
function getFileSum(dir, filename, noFill = false) {
  const filepath = noFill ? filename : `${dir}/${filename}`;
  const enc = new TextEncoder();
  return enc.encode(readFileSync(filepath)).reduce((t, e) => t + e, 0);
}

/**
 * A little wrapper that turns exec() into an async rather than callback call.
 */
function execPromise(command, options = {}) {
  return new Promise((resolve, reject) =>
    exec(command, options, (err, stdout, stderr) => {
      if (err) return reject(stderr);
      resolve(stdout.trim());
    })
  );
}

/**
 * Ask the OS for a flat dir listing.
 */
async function readContentDir(dir) {
  let dirListing;
  let listCommand = isWindows ? `dir /b/o/s "${dir}"` : `find ${dir}`;

  try {
    dirListing = await execPromise(listCommand);
  } catch (e) {
    // This can happen if the server reboots but the client didn't
    // reload, leading to a session name mismatch.
    console.warn(e);
    return false;
  }

  const removal = new RegExp(`.*${dir}\\/`);
  return dirListing
    .split(/\r?\n/)
    .map((v) => v.split(sep).join(posix.sep).replace(removal, ``))
    .filter((v) => !!v && !v.startsWith(`.git`) && v !== dir);
}

/**
 * Create a new project directory
 *
 * TODO: this is middleware, rehouse it
 *
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
export async function createProject(req, res, next) {
  const user = req.session.passport?.user;
  if (!user) return next(new Error(`Not logged in`));

  const projectName = res.locals.projectName || res.params.project;
  const dir = join(CONTENT_DIR, projectName);
  const starter = `__starter_projects/${req.params.starter || `web-graphics`}`;

  if (!existsSync(dir)) {
    mkdirSync(dir);
    cpSync(dir.replace(projectName, starter), dir, { recursive: true });
  }

  createProjectForUser(user.displayName, projectName);

  next();
}

/**
 * Switch a user's current project. This can build a project if it doesn't
 * exist if the "create" parameters is pass via the request (e.g. "create
 * new project" button requests).
 *
 * TODO: this is middleware, rehouse it
 *
 */
async function loadProject(req, res, next) {
  const projectName = res.locals.projectName || res.params.project;
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
 * Make git not guess at the name and email for commits.
 */
async function setupGit(dir, projectName) {
  for (let cfg of [
    `init.defaultBranch main`,
    `user.name "${projectName}"`,
    `user.email "actions@browsertests.local"`,
  ]) {
    await execPromise(`git config --local ${cfg}`, { cwd: dir });
  }
}
