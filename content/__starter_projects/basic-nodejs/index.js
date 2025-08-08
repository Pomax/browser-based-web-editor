import { execSync } from "node:child_process";

// Use Express, https://expressjs.com, which is
// a long-establish Node based web server.
import express from "express";

// Also use nunjucks, which is a templating engine
// that lets us put placeholders in things like HTML,
// CSS, and JS files, and then when a browser asks
// for those files, fill in those placeholder values
// before sending a response.
import nunjucks from "nunjucks";

// All projects get an environment variable called
// PORT, which is the single port number that a
// server can be accessed through from the outside.
const { PORT } = process.env;

// 1: create our express server:
const app = express();

// 2: make sure it uses nunjucks for any file that
//    can be found in the "public" dir:
nunjucks.configure("public", {
  autoescape: true,
  noCache: true,
  express: app,
});

// 3: set up a single "route", in this case the root
//    location, and make that send people our index.html
//    content when they ask for it, with the {{node}}
//    and {{python}} placeholders replaced "on the fly":
app.get(`/`, (req, res) => {
  res.render(`index.html`, {
    node: execSync(`node --version`).toString(),
    python: execSync(`python3 --version`).toString(),
  });
});

// 4: Then activate our server, so that it's listening
//    for outside requests on the port number that the
//    system gave us:
app.listen(PORT, () => {
  console.log(`listening...`);
});
