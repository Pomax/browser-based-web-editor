// Set up the render engine:
import nunjucks from "nunjucks";
import { safify, scrubDateTime } from "./helpers.js";

export function setupTemplating(app) {
  const nenv = nunjucks.configure("src/server/pages", {
    autoescape: true,
    noCache: true,
    express: app,
  });

  nenv.addFilter(`para`, (str, count) =>
    str
      ?.split(`\n`)
      .filter(Boolean)
      .map((p) => `<p>${safify(p)}</p>`)
      .join(`\n`)
  );

  nenv.addFilter(`year`, (str, count) => str?.split(/[ T]/)[0]);

  nenv.addFilter(`date`, (str, count) => scrubDateTime(str));

  nenv.addFilter(`shorthash`, (str, count) => str.substring(0, 16));

  nenv.addFilter(`dockerimg`, (str, count) =>
    str.startsWith(`sha256`) ? `(hash only)` : str
  );
}
