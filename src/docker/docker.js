import { sep } from "node:path";
import { getFreePort } from "../server/utils.js";
import { exec, execSync } from "child_process";
import { updateCaddyFile } from "../server/caddy.js";

const commands = {
  exists: () => `docker image list`,
  build: (name) => `docker build --tag ${name} --no-cache .`,
  running: (name) => `docker ps -f name=${name}`,
  run: (name, port) =>
    `docker run --rm --stop-timeout 0 --name ${name} --mount type=bind,src=.${sep}content${sep}${name},dst=/app -p ${port}:8000 -t ${name}`,
  restart: (name) => `docker container restart -t 0 ${name}`,
};

const { exists, build, running, run, restart } = commands;

export async function runContainer(req, name = req.session.name, port) {
  port ??= await getFreePort();
  req.session.port = port;
  req.session.save();

  console.log(`- Checking for image`);

  // Do we have a container? If not, build one.
  let result = execSync(exists()).toString().trim();
  if (!result.match(new RegExp(`\\b${name}\\b`, `gm`))) {
    console.log(`- Building image`);
    execSync(build(name));
  }

  console.log(`- Checking for running container`);

  // FIXME: TODO: check if `docker ps -a` has a dead container that we need to cleanup

  result = execSync(running(name)).toString().trim();

  console.log(result);

  if (!result.match(new RegExp(`\\b${name}\\b`, `gm`))) {
    console.log(`- Starting container on port ${port}`);
    const container = run(name, port);
    console.log(container);
    exec(container);
  } else {
    port = result.match(/0.0.0.0:(\d+)->/m)[1];
    console.log(`- found a running container on port ${port}`);
    req.session.port = port;
    req.session.save();
    console.log(`- updated session port`);
  }
  updateCaddyFile(name, port);
}

export function restartContainer(name) {
  console.log(`restarting container for ${name}...`);
  execSync(restart(name));
  console.log(`...done!`);
}

export function deleteContainerAndImage(name) {
  console.log(`removing container and image...`);
  try {
    execSync(`docker container stop ${name}`);
  } catch (e) {
    // this is a "just in case". If it fails, that's fine.
  }
  try {
    execSync(`docker container rm ${name}`);
  } catch (e) {
    // same deal - just in case.
  }
  execSync(`docker image rm ${name}`);
}
