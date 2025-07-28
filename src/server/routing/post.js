export { addPostRoutes };

import {
  getFileSum,
  execPromise,
  createRewindPoint,
  CONTENT_DIR,
} from "../helpers.js";

import {
  restartContainer,
  deleteContainerAndImage,
} from "../../docker/docker.js";

import { 
  removeCaddyEntry
} from "../../server/caddy.js";

import {
  parseBodyText,
  parseMultiPartBody,
} from "../middleware/body-parsing.js";

import {
  createProjectForUser,
  deleteProjectForUser,
} from "../../../data/database.js";

import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "fs";

import { sep } from "path";
import { spawnSync } from "child_process";
import multer from "multer";
import { applyPatch } from "../../../public/vendor/diff.js";

const isWindows = process.platform === `win32`;
const npm = isWindows ? `npm.cmd` : `npm`;

const upload = multer({
  limits: {
    fieldSize: 25 * 1024 * 1024,
  },
});

function addPostRoutes(app) {
  // (Reversibly, thanks to git) delete a file
  app.delete(`/delete/:slug*`, (req, res) => {
    const fileName = req.params.slug + req.params[0];
    const filePath = `${req.session.dir}/${fileName}`;
    try {
      unlinkSync(filePath);
      res.send(`deleted`);
      createRewindPoint(req);
    } catch (e) {
      console.error(e);
      res.status(400).send(`could not delete ${filePath}`);
    }
  });

  app.delete(`/delete-dir/:slug*`, (req, res) => {
    const dirName = req.params.slug + req.params[0];
    if (dirName === `.`) return res.status(400).send(`absolutely not`);
    const dirPath = `${req.session.dir}/${dirName}`;
    try {
      rmSync(dirPath, { recursive: true });
      res.send(`deleted`);
      createRewindPoint(req);
    } catch (e) {
      console.error(e);
      res.status(400).send(`could not delete ${dirPath}`);
    }
  });

  // A route to trigger on-disk code formatting, based on file extension.
  app.post(`/format/:slug*`, (req, res) => {
    let formatted = false;
    const fileName = `${req.session.dir}/${req.params.slug + req.params[0]}`;
    const ext = fileName.substring(fileName.lastIndexOf(`.`), fileName.length);
    if ([`.js`, `.css`, `.html`].includes(ext)) {
      console.log(`running prettier...`);
      spawnSync(npm, [`run`, `prettier`, `--`, fileName], { stdio: `inherit` });
      formatted = true;
    }
    res.json({ formatted });
    createRewindPoint(req);
  });

  // Create a new file.
  app.post(`/new/:slug*`, (req, res) => {
    const full = `${req.session.dir}/${req.params.slug + req.params[0]}`;
    const slug = full.substring(full.lastIndexOf(`/`) + 1);
    const dirs = full.replace(`/${slug}`, ``);
    mkdirSync(dirs, { recursive: true });
    console.log(`what's in new:`, full, slug, dirs);
    if (!existsSync(full)) {
      if (slug.includes(`.`)) {
        writeFileSync(full, ``);
      } else {
        mkdirSync(dirs + sep + slug);
      }
    }
    res.send(`ok`);
    createRewindPoint(req);
  });

  // Rename a file
  app.post(`/rename/:slug*`, upload.none(), (req, res) => {
    const slug = req.params.slug + req.params[0];
    const parts = slug.split(`:`);
    const oldName = `${req.session.dir}/${parts[0]}`;
    if (oldName === `.`) return res.status(400).send(`absolutely not`);
    const newName = `${req.session.dir}/${parts[1]}`;
    console.log(`rename attempt:`, oldName, `->`, newName);
    try {
      renameSync(oldName, newName);
      res.send(`ok`);
      createRewindPoint(req);
    } catch (e) {
      res.status(400).send(`failed`);
    }
  });

  // Instead of a true rewind, revert the files, but *keep* the git history,
  // and just spin a new commit that "rolls back" everything between the
  // HEAD and the target commit, so that we never lose work.
  //
  // It's only ever a linear timeline, because the human experience is
  // linear in time.
  //
  // Unless ?hard=1 is used, in which case I hope you know what you're doing.
  app.post(`/rewind/:hash`, async (req, res) => {
    const hash = req.params.hash;
    const hard = !!req.query.hard;
    console.log(`checking hash ${hash}`);
    try {
      const cwd = { cwd: req.session.dir };
      await execPromise(`git cat-file -t ${hash}`, cwd); // throws if not found
      if (hard) {
        await execPromise(`git reset ${hash}`, cwd);
      } else {
        await execPromise(`git diff HEAD ${hash} | git apply`, cwd);
      }
      // TODO: add the actual git commit? rewind needs work.
      res.send(`ok`);
    } catch (err) {
      res.status(400).send(`unable to comply`);
    }
  });

  // Synchronize file changes from the browser to the on-disk file, by applying a diff patch
  app.post(`/sync/:slug*`, parseBodyText, (req, res) => {
    const fileName = `${req.session.dir}/${req.params.slug + req.params[0]}`;
    let data = readFileSync(fileName).toString(`utf8`);
    const patch = req.body;
    const patched = applyPatch(data, patch);
    if (patched) writeFileSync(fileName, patched);
    const hash = "" + getFileSum(req.session.dir, fileName, true);
    res.send(hash);
    createRewindPoint(req);
  });

  // Create a fully qualified file.
  app.post(`/upload/:slug*`, parseMultiPartBody, (req, res) => {
    const full = `${req.session.dir}/${req.params.slug + req.params[0]}`;
    const slug = full.substring(full.lastIndexOf(`/`) + 1);
    const dirs = full.replace(`/${slug}`, ``);
    const fileName = req.body.filename.value;
    const fileData = req.body.content.value;
    const fileSize = fileData.length;
    if (fileSize > 1_000_000) {
      return res.status(400).send(`Upload too large`);
    }
    mkdirSync(dirs, { recursive: true });
    writeFileSync(full, fileData, `ascii`);
    res.send(`ok`);
    createRewindPoint(req);
  });

  // Restart a project container
  app.post(`/restart`, async (req, res) => {
    restartContainer(req.session.name);
    res.send(`ok`);
  });

  // Create a new project
  app.post(`/project/create`, (req, res) => {
    // TODO: FIXME: only names that are valid domain fragments should be allowed
    const { user } = req.session.passport ?? {};
    const { displayName: userName } = user;
    const { name: projectName } = req.body;
    console.log(
      `Creating new project "${projectName}" with ${userName} as owner`
    );
    try {
      createProjectForUser(userName, projectName);
      return res.redirect(`/editor.html?project=${projectName}`);
    } catch (e) {
      console.error(e);
    }
    res.redirect(`/`);
  });

  app.post(`/project/delete/:id`, (req, res) => {
    try {
      console.log(`Performing database operations`);
      const projectName = deleteProjectForUser(
        req.session.passport?.user.displayName,
        req.params.id
      );

      console.log(`Cleaning up Caddyfile`);
      removeCaddyEntry(projectName);

      console.log(`Cleaning up ${projectName} container and image`);
      deleteContainerAndImage(projectName);

      console.log(`Removing ${projectName} from the filesystem`);
      rmSync(`${CONTENT_DIR}/${projectName}`, {
        recursive: true,
        force: true,
      });

      res.redirect(`/`);
    } catch (e) {
      res.send(`Cannot delete this project.`);
    }
  });
}
