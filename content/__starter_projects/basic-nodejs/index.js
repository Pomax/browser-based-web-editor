import { execSync } from "node:child_process";
import nunjucks from "nunjucks";
import express from "express";

const { PORT } = process.env;

const app = express();
nunjucks.configure("public", {
  autoescape: true,
  noCache: true,
  express: app,
});

app.get(`/`, (req, res) => {
  res.render(`index.html`);
});

app.listen(PORT, () => {
  console.log(`listening...`);
});
