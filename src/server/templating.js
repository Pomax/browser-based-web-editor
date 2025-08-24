// Set up the render engine:
import nunjucks from "nunjucks";

export function setupTemplating(app) {
  const nenv = nunjucks.configure("src/server/pages", {
    autoescape: true,
    noCache: true,
    express: app,
  });

  nenv.addFilter(`year`, (str, count) => str?.split(/[ T]/)[0]);
  nenv.addFilter(`date`, (str, count) =>
    str?.replace(`T`, ` `).replace(`Z`, ``).replace(/\.\d+/, ``)
  );
  nenv.addFilter(`shorthash`, (str, count) => str.substring(0, 16));
  nenv.addFilter(`dockerimg`, (str, count) =>
    str.startsWith(`sha256`) ? `(hash only)` : str
  );
}
