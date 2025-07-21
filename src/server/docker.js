import { getFreePort } from "./utils.js";
import { exec, execSync } from "child_process";

const commands = {
  exists: () => `docker image list`,
  build: (name) => `docker build --tag ${name} --no-cache .`,
  running: (name) => `docker ps -f name=${name}`,
  run: (name, port) =>
    `docker run --name ${name} --mount type=bind,src=./content/${name},dst=/app -p ${port}:8000 -t ${name}`,
  restart: (name) => `docker container restart -t 0 ${name}`,
};

const { exists, build, running, run, restart } = commands;

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

  // FIXME: TODO: check if `docker ps -a` has a dead container that we need to cleanup

  result = execSync(running(name)).toString().trim();
  if (!result.match(new RegExp(`\\b${name}\\b`, `gm`))) {
    console.log(`- Starting container`);
    const cmd = run(name, port);
    console.log(cmd);
    exec(cmd);
  } else {
    req.session.port = result.match(/0.0.0.0:(\d+)->/m)[1];
    req.session.save();
    console.log(`- found a running container`);
  }
}

export function restartContainer(req) {
  const { name } = req.session;
  console.log(`restarting container for ${name}...`);
  execSync(restart(req.session.name));
  console.log(`...done!`);
}
