import { getFreePort } from "./utils.js";
import { exec, execSync } from "child_process";

const exists = () => `docker image list`;
const build = (name) => `docker build --tag ${name} --no-cache .`;
const running = (name) => `docker ps -f name=${name}`;
const run = (name, port) =>
  `docker run --name ${name} --mount type=bind,src=./content/${name},dst=/app -p ${port}:8000 -t ${name}`;

export async function runContainer(req, name = req.session.name, port) {
  port ??= await getFreePort();
  req.session.port = port;
  req.session.save();

  console.log(`Running user container for ${name} on port ${port}`);
  console.log(`- Checking for image`);

  let result = execSync(exists()).toString().trim();

  if (!result.match(new RegExp(`\\b${name}\\b`, `gm`))) {
    console.log(`- Building image`);
    execSync(build(name));
  }

  console.log(`- Checking for running container`);

  result = execSync(running(name)).toString().trim();
  if (!result.match(new RegExp(`\\b${name}\\b`, `gm`))) {
    console.log(`- Starting container`);
    exec(run(name, port));
  } else {
    req.session.port = result.match(/0.0.0.0:(\d+)->/m)[1];
    req.session.save();
    console.log(`- found a running container`);
  }
}
