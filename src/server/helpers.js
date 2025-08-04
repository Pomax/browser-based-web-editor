import net from "node:net";
import { readFileSync } from "node:fs";
import { sep, posix } from "node:path";
import { exec } from "node:child_process";

export const isWindows = process.platform === `win32`;
export const npm = isWindows ? `npm. cmd` : `npm`;

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
 * Used for docker bindings
 */
export function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, () => {
      const { port } = server.address();
      server.close((err) => (err ? reject(err) : resolve(port)));
    });
  });
}

/**
 * Schedule a git commit to capture all changes since the last time we did that.
 * @param {*} projectName
 * @param {*} reason
 */
export function createRewindPoint(projectName, reason) {
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
export function getFileSum(dir, filename, noFill = false) {
  const filepath = noFill ? filename : `${dir}/${filename}`;
  const enc = new TextEncoder();
  return enc.encode(readFileSync(filepath)).reduce((t, e) => t + e, 0);
}

/**
 * A little wrapper that turns exec() into an async rather than callback call.
 */
export async function execPromise(command, options = {}) {
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
export async function readContentDir(dir) {
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
  const filtered = dirListing
    .split(/\r?\n/)
    .map((v) => v.split(sep).join(posix.sep).replace(removal, ``))
    .filter((v) => !!v && !v.startsWith(`.git`) && v !== dir);

  return filtered;
}

/**
 * Make git not guess at the name and email for commits.
 */
export async function setupGit(dir, projectName) {
  for (let cfg of [
    `init.defaultBranch main`,
    `user.name "${projectName}"`,
    `user.email "actions@browsertests.local"`,
  ]) {
    await execPromise(`git config --local ${cfg}`, { cwd: dir });
  }
}
