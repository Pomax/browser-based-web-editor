export { addGetRoutes };

import {
  deleteExpiredAnonymousContent,
  loadProject,
  loadProjectList,
} from "../middleware/middleware.js";
import { authenticate } from "../middleware/passport.js";
import { getFileSum, execPromise, readContentDir } from "../helpers.js";
import { posix } from "path";
import { __dirname } from "../../constants.js";

function addGetRoutes(app) {
  // Get the current file tree from the server
  app.get(`/dir`, async (req, res) => {
    const osResponse = await readContentDir(req.session.dir);
    if (osResponse === false) {
      // FIXME: TODO: this... should not be possible?
      return new Error(`read dir didn't work??`);
    }
    const dir = osResponse
      // strip out the absolute path prefix
      .map((v) => v.replace(__dirname + posix.sep, ``))
      // and filter out the .git directory
      .filter((v) => !v.startsWith(`.git`));
    res.json(dir);
  });

  // Add an extra job when loading the editor that destroys old
  // anonymous content, cleaning up the dirs based on the timestamp.
  app.get(
    `/editor.html`,
    deleteExpiredAnonymousContent,
    loadProjectList,
    loadProject,
    (req, res) => {
      if (!req.session.passport?.user) {
        return res.redirect(`/`);
      }
      res.render(`editor.html`, req.session);
    }
  );

  // Get the git log, to show all rewind points.
  app.get(`/history`, async (req, res) => {
    const output = await execPromise(
      `git log  --no-abbrev-commit --pretty=format:"%H%x09%ad%x09%s"`,
      {
        cwd: req.session.dir,
      }
    );
    const parsed = output.split(`\n`).map((line) => {
      let [hash, timestamp, reason] = line.split(`\t`).map((e) => e.trim());
      reason = reason.replace(/^['"]?/, ``).replace(/['"]?$/, ``);
      return { hash, timestamp, reason };
    });
    res.json(parsed);
  });

  // the default page
  app.get(`/`, loadProjectList, (req, res) => {
    res.render(`main.html`, req.session);
  });
}
