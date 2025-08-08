import { sep } from "node:path";
import { getFreePort } from "../server/helpers.js";
import { exec, execSync } from "child_process";
import { removeCaddyEntry, updateCaddyFile } from "../caddy/caddy.js";

/**
 * ...docs go here...
 * @param {*} projectName
 */
export async function runContainer(projectName) {
  console.log(`attempting to run container ${projectName}`);
  let port = await getFreePort();

  // Do we have a container? If not, build one.
  console.log(`- Checking for image`);
  let result = execSync(`docker image list`).toString().trim();

  if (!result.match(new RegExp(`\\b${projectName}\\b`, `gm`))) {
    console.log(`- Building image`);
    execSync(`docker build --tag ${projectName} --no-cache .`);
  }

  // FIXME: TODO: check if `docker ps -a` has a dead container that we need to cleanup

  console.log(`- Checking for running container`);
  result = execSync(`docker ps -f name=${projectName}`).toString().trim();

  if (!result.match(new RegExp(`\\b${projectName}\\b`, `gm`))) {
    console.log(`- Starting container on port ${port}`);
    const runFlags = `--rm --stop-timeout 0 --name ${projectName}`;
    const bindMount = `--mount type=bind,src=.${sep}content${sep}${projectName},dst=/app`;
    const runCommand = `docker run ${runFlags} ${bindMount} -p ${port}:8000 -t ${projectName}`;
    exec(runCommand);
  } else {
    port = result.match(/0.0.0.0:(\d+)->/m)[1];
    console.log(`- found a running container on port ${port}`);
  }

  updateCaddyFile(projectName, port);
}

/**
 * ...docs go here...
 * @param {*} name
 * @returns
 */
export function checkContainerHealth(name) {
  const result = execSync(`docker ps -f name=${projectName}`).toString().trim();
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

/**
 * ...docs go here...
 * @param {*} name
 */
export function restartContainer(name) {
  console.log(`restarting container for ${name}...`);
  execSync(`docker container restart -t 0 ${name}`);
  console.log(`...done!`);
}

/**
 * ...docs go here...
 * @param {*} oldName
 * @param {*} newName
 */
export function renameContainer(oldName, newName) {
  stopContainer(oldName);
  try {
    execSync(`docker tag ${oldName} ${newName}`);
    execSync(`docker rmi ${oldName}`);
  } catch (e) {}
  runContainer(newName);
}

/**
 * ...docs go here...
 * @param {*} name
 */
export function stopContainer(name) {
  try {
    execSync(`docker container stop ${name}`);
  } catch (e) {
    // failure just means it's already no longer running.
  }
  removeCaddyEntry(name);
}

/**
 * ...docs go here...
 * @param {*} name
 */
export function deleteContainer(name) {
  try {
    execSync(`docker container rm ${name}`);
  } catch (e) {
    // failure just means it's already been removed.
  }
  try {
    execSync(`docker image rm ${name}`);
  } catch (e) {
    // idem dito
  }
}

/**
 * ...docs go here...
 * @param {*} name
 */
export function deleteContainerAndImage(name) {
  console.log(`removing container and image...`);
  stopContainer(name);
  deleteContainer(name);
}
