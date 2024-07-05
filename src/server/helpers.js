// exports first, so it's easier for someone to see what's on offer.
// And this works because functions get hoisted at parse-time.
export {
  createRewindPoint,
  execPromise,
  getFileSum,
  readContentDir,
  setupGit,
  switchUser,
  reloadPageInstruction,
};

import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
} from "fs";

// Are we on Windows, or something unixy?
import { sep, posix } from "path";
import { exec, execSync } from "child_process";
const isWindows = process.platform === `win32`;

// Set up the vars we need for pointing to the right dirs
const CONTENT_BASE = process.env.CONTENT_BASE ?? `content`;
process.env.CONTENT_BASE = CONTENT_BASE;
const CONTENT_DIR = isWindows ? CONTENT_BASE : `./${CONTENT_BASE}`;
process.env.CONTENT_DIR = CONTENT_DIR;

// Set up the things we need for scheduling git commits when
// content changes, or the user requests an explicit rewind point:
const COMMIT_TIMEOUT_MS = 5_000;

// We can't save timeouts to req.session so we need a separate tracker
const COMMIT_TIMEOUTS = {};

function createRewindPoint(req, reason = `Autosave`) {
  const { name, dir } = req.session;

  console.log(`scheduling rewind point`);
  const debounce = COMMIT_TIMEOUTS[name];
  if (debounce) clearTimeout(debounce);

  COMMIT_TIMEOUTS[name] = setTimeout(async () => {
    console.log(`creating rewind point`);
    const cmd = `cd ${dir} && git add . && git commit --allow-empty -m "${reason}"`;
    console.log(`running:`, cmd);
    try {
      await execPromise(cmd);
    } catch (e) {
      console.error(e);
    }
    COMMIT_TIMEOUTS[name] = undefined;
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
 * Send a response that triggers a page-reload in the browser.
 */
function reloadPageInstruction(req, res, status = 400) {
  req.session.destroy();
  res.status(status).header(`x-reload-page`, `1`).send();
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
 * ...
 */
function switchUser(req, name = req.params.name) {
  const oldName = req.session.name;
  const oldDir = req.session.dir;
  const dir = `${CONTENT_DIR}/${name}`;

  console.log(`switching user from ${oldName} to ${name}`);

  req.session.name = name;
  req.session.dir = dir;
  req.session.save();

  let newUser = false;
  if (!existsSync(dir)) {
    newUser = true;
    mkdirSync(dir);
    // New, temporary anonymous dir?
    if (name.startsWith(`anonymous-`)) {
      const index = `${CONTENT_DIR}/anonymous/index.html`;
      const target = `${dir}/index.html`;
      console.log(`${index} => ${target}`);
      copyFileSync(index, target);
    }
    // "regular" user, give them the test user content
    else {
      cpSync(dir.replace(name, `testuser`), dir, { recursive: true });
    }
  } else if (oldName.startsWith(`anonymous-`)) {
    // If we switch from anonymous to real user, we
    // delete the anonymous dir because that content
    // was mostly a signal for someone to log in.
    rmSync(oldDir, { recursive: true, force: true });
  }

  // ensure there's a git dir
  if (!existsSync(`${dir}/.git`)) {
    console.log(`adding git tracking for ${dir}`);
    execSync(`cd ${dir} && git init && cd ..`);
  }

  // If not, is this a switch from an anonymous "account" to a new, real "account"?
  else if (oldName.startsWith(`anonymous-`) && oldDir && newUser) {
    // TODO: Copy the anonymous user's files to their new, real
    //       dir, and then delete the anonymous-12345 directory.
  }

  // ensure git knows who we are.
  setupGit(req);

  return dir;
}

/**
 * Make git not guess at the name and email for commits.
 */
async function setupGit(req) {
  const { name, dir } = req.session;
  for (let cfg of [
    `init.defaultBranch main`,
    `user.name "${name}"`,
    `user.email "actions@browsertests.local"`,
  ]) {
    await execPromise(`git config --local ${cfg}`, { cwd: dir });
  }
}
