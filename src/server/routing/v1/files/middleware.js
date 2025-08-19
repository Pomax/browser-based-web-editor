import mime from "mime";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { lstat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { getAccessFor, MEMBER } from "../../../database.js";
import {
  CONTENT_DIR,
  createRewindPoint,
  execPromise,
  getFileSum,
  npm,
  readContentDir,
} from "../../../helpers.js";
import { applyPatch } from "../../../../../public/vendor/diff.js";

/**
 * ...docs go here...
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
export function getMimeType(req, res, next) {
  const { fileName } = res.locals;
  const mimeType = mime.getType(fileName);
  res.locals = {
    mimeType,
    data: readFileSync(fileName),
  };
  next();
}

/**
 * ...docs go here...
 * @param {*} req
 * @param {*} res
 * @param {*} next
 * @returns
 */
export async function getDirListing(req, res, next) {
  const { userName, projectName } = res.locals;
  if (projectName) {
    const __dirname = join(CONTENT_DIR, projectName);

    let dir = await readContentDir(__dirname);
    if (dir === false) {
      return next(new Error(`read dir didn't work??`));
    }

    // Remove any "private" data from the dir listing if
    // the user has no access rights to them.
    const accessLevel = getAccessFor(userName, projectName);

    // Users do not directly interact with the .container
    // folder. Instead its content is regulated via the
    // project settings.
    dir = dir.filter((v) => !v.match(/^\.container\b/));

    if (accessLevel < MEMBER) {
      // private data is only visible to owners, editors, and
      dir = dir.filter((v) => !v.match(/^\.data\b/));
    }

    res.locals.dir = dir;
  }
  next();
}

/**
 * ...docs go gere,,,
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
export function createFile(req, res, next) {
  const { projectName, fileName } = res.locals;
  const slug = fileName.substring(fileName.lastIndexOf(`/`) + 1);
  const dirs = fileName.replace(`/${slug}`, ``);
  mkdirSync(dirs, { recursive: true });
  if (!existsSync(fileName)) {
    if (slug.includes(`.`)) {
      writeFileSync(fileName, ``);
    } else {
      mkdirSync(join(dirs, slug));
    }
  }
  createRewindPoint(projectName);
  next();
}

/**
 * ...docs go here...
 * @param {*} req
 * @param {*} res
 * @param {*} next
 * @returns
 */
export function handleUpload(req, res, next) {
  const { projectName, fileName } = res.locals;
  const slug = fileName.substring(fileName.lastIndexOf(`/`) + 1);
  const dirs = fileName.replace(`/${slug}`, ``);
  const fileData = req.body.content.value;
  const fileSize = fileData.length;
  if (fileSize > 10_000_000) {
    return next(new Error(`Upload size exceeded`));
  }
  mkdirSync(dirs, { recursive: true });
  writeFileSync(fileName, fileData, `ascii`);
  createRewindPoint(projectName);
  next();
}

/**
 * ...docs go here...
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
export function patchFile(req, res, next) {
  const { projectName, fileName } = res.locals;
  let data = readFileSync(fileName).toString(`utf8`);
  const patch = req.body;
  const patched = applyPatch(data, patch);
  if (patched) writeFileSync(fileName, patched);
  res.locals.fileHash = `${getFileSum(projectName, fileName, true)}`;
  createRewindPoint(res.locals.projectName);
  next();
}

/**
 * ...docs go here...
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
export async function moveFile(req, res, next) {
  const { projectName } = res.locals;
  const slug = req.params.slug + req.params[0];
  const parts = slug.split(`:`);
  const oldPath = join(CONTENT_DIR, projectName, parts[0]);
  if (oldPath === `.`) {
    return next(new Error(`Illegal rename`));
  }
  const newPath = join(CONTENT_DIR, projectName, parts[1]);
  try {
    renameSync(oldPath, newPath);
    createRewindPoint(projectName);
    next();
  } catch (e) {
    next(new Error(`Rename failed`));
  }
}

/**
 * ...docs go here...
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
export async function deleteFile(req, res, next) {
  const { projectName, fileName } = res.locals;
  const fullPath = resolve(fileName);
  const isDir = (await lstat(fullPath)).isDirectory();
  try {
    if (isDir) {
      rmSync(fullPath, { recursive: true });
    } else {
      unlinkSync(fullPath);
    }
    createRewindPoint(projectName);
    next();
  } catch (e) {
    console.error(e);
    next(new Error(`Could not delete ${fullPath}`));
  }
}

/**
 * ...docs go here...
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
export async function formatFile(req, res, next) {
  let formatted = false;
  const { projectName, fileName } = res.locals;
  const ext = fileName.substring(fileName.lastIndexOf(`.`), fileName.length);
  if ([`.js`, `.css`, `.html`].includes(ext)) {
    try {
      await execPromise(`${npm} run prettier -- ${fileName}`);
      formatted = true;
    } catch (e) {
      return next(
        new Error(`Prettier could not format file:\n` + e.toString())
      );
    }
  }
  if ([`.py`].includes(ext)) {
    try {
      await execPromise(`black ${fileName}`);
      formatted = true;
    } catch (e) {
      return next(new Error(`Black could not format file:\n` + e.toString()));
    }
  }
  res.locals.formatted = formatted;
  createRewindPoint(projectName);
  next();
}
