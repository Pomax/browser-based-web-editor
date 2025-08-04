import { sep } from "node:path";
import { getFreePort } from "../server/helpers.js";
import { exec, execSync } from "child_process";
import { updateCaddyFile } from "../caddy/caddy.js";

const commands = {
  exists: () => `docker image list`,
  build: (name) => `docker build --tag ${name} --no-cache .`,
  running: (name) => `docker ps -f name=${name}`,
  run: (name, port) =>
    `docker run --rm --stop-timeout 0 --name ${name} --mount type=bind,src=.${sep}content${sep}${name},dst=/app -p ${port}:8000 -t ${name}`,
  restart: (name) => `docker container restart -t 0 ${name}`,
};

const { exists, build, running, run, restart } = commands;

export async function runContainer(projectName) {
  let port = await getFreePort();

  console.log(`- Checking for image`);

  // Do we have a container? If not, build one.
  let result = execSync(exists()).toString().trim();

  if (!result.match(new RegExp(`\\b${projectName}\\b`, `gm`))) {
    console.log(`- Building image`);
    execSync(build(projectName));
  }

  console.log(`- Checking for running container`);

  // FIXME: TODO: check if `docker ps -a` has a dead container that we need to cleanup

  result = execSync(running(projectName)).toString().trim();

  if (!result.match(new RegExp(`\\b${projectName}\\b`, `gm`))) {
    console.log(`- Starting container on port ${port}`);
    const container = run(projectName, port);
    console.log(container);
    exec(container);
  } else {
    port = result.match(/0.0.0.0:(\d+)->/m)[1];
    console.log(`- found a running container on port ${port}`);
  }

  updateCaddyFile(projectName, port);
}

export function checkContainerHealth(name) {
  const result = execSync(running(name)).toString().trim();
  if (result.includes(`Exited`)) {
    return `failed`;
  }
  if (!result.includes`0.0.0.0`) {
    return `not running`;
  }
  if (result.includes(`starting`)) {
    return `wait`;
  }
  if (result.includes(`(healthy)`)) {
    return `ready`;
  }
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
  try {
    execSync(`docker image rm ${name}`);
  } catch (e) {
    // and, one more time.
  }
}
