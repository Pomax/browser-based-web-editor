/**
 * The "browser based web editor" setup script. This script:
 *
 * - will run npm install to make sure the code can run,
 * - checks whether or not you have docker, caddy, and sqlite3 installed
 * - If you don't, it'll do nothing.
 * - If you do, it'll set up the docker base image that is used for projects,
 * - set up a Caddyfile for this project that gets used for host routing, and
 * - set up the database that the code relies on for housing user/project/etc data.
 * - and finally, sets up the first user and project so you get started.
 */

import readline from "node:readline";
import { execSync } from "node:child_process";
import { cpSync, existsSync, writeFileSync } from "node:fs";
import { runContainer } from "./src/docker/docker-helpers.js";

const stdin = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function question(q) {
  return new Promise((resolve) => {
    stdin.question(q, (value) => {
      value = value.trim();
      if (!value) return resolve(question(q));
      resolve(value);
    });
  });
}

setup(
  // do we have everything we need?
  runNpmInstall,
  checkDependencies,
  // Excellent. Let's set up what we need
  setupDocker,
  setupCaddy,
  setupSqlite,
  setupEnv
);

/**
 * This is a utility function that just runs through a series of functions
 * and if none of them throw, setup was a success. If even a single one
 * throws, then setup is halted and you get informed about that failure.
 */
async function setup(...handlers) {
  try {
    while (handlers.length) {
      await handlers.shift()();
    }
    console.log(`\nSetup complete. Run "npm start" to get going!\n`);
    process.exit(0);
  } catch (e) {
    console.log(e);
    console.log(`\nSetup incomplete. Please review the errors.\n`);
    process.exit(1);
  }
}

/**
 * Install all npm dependencies for this codebase
 */
function runNpmInstall() {
  execSync(`npm i`, { shell: true, stdio: `ignore` });
}

/**
 * Verify we have all the tools necessary to run the codebase
 */
function checkDependencies() {
  const docker = checkForDocker();
  const caddy = checkForCaddy();
  const sqlite = checkForSqlite();
  if (!docker || !caddy || !sqlite) {
    throw new Error(`Missing dependencies`);
  }
}

/**
 * Generic "see if this command works" code
 */
function checkFor(cmd) {
  try {
    execSync(`${cmd} --version`, { env: process.env });
    return true;
  } catch (e) {
    console.log(e);
    console.error(`Command "${cmd}" does not appear to be available`);
  }
}

/**
 * Check if the docker command works, and if it does, whether or not
 * docker engine is running, because the docker CLI can't work without
 * that running in the background.
 */
function checkForDocker() {
  checkFor(`docker`);
  try {
    execSync(`docker ps`, { shell: true, stdio: `ignore` });
    return true;
  } catch (e) {
    console.error(`Docker is avaiable, but docker engine is not running.`);
  }
}

/**
 * Is caddy installed?
 */
function checkForCaddy() {
  return checkFor(`caddy`);
}

/**
 * Is sqlite3 installed?
 */
function checkForSqlite() {
  return checkFor(`sqlite3`);
}

/**
 * If we have docker available, check to see if the base image that
 * the codebase needs already exists, and if not, build it.
 */
function setupDocker() {
  try {
    execSync(`docker image inspect local-base-image`, {
      shell: true,
      stdio: `ignore`,
    });
  } catch (e) {
    execSync(`docker build -t local-base-image .`, {
      shell: true,
      cwd: `./src/docker`,
      stdio: `ignore`,
    });
  }
}

/**
 * If we have caddy available, check to see if there's a Caddyfile
 * in the right place, and if not, create it.
 */
function setupCaddy() {
  if (existsSync(`./src/caddy/Caddyfile`)) return;
  cpSync(`./src/caddy/Caddyfile.default`, `./src/caddy/Caddyfile`);
}

/**
 * If we have sqlite3 available, check to see if there's a data.sqlite3
 * database file in the right place, and if not, create it.
 */
async function setupSqlite() {
  if (existsSync(`./data/data.sqlite3`)) return;

  try {
    execSync(`sqlite3 ./data/data.sqlite3 ".read ./data/schema.sql"`);
  } catch (e) {
    // We explicitly make it fail by using a bad SQL intruction
    // as exit hack. Otherwise the REPL run and we never exit =_=
  }

  const firstUser = (await question(`First user? `)).trim();
  const firstProject = (await question(`First project? `)).toLowerCase().trim();
  cpSync(
    `./content/__starter_projects/basic-nodejs/`,
    `./content/${firstProject}`,
    {
      recursive: true,
    }
  );

  const seed = `-- initial seed data
INSERT INTO users (id, name, enabled_at) values (1, '${firstUser}', CURRENT_TIMESTAMP);
INSERT INTO admin_table (user_id) VALUES (1);
INSERT INTO projects (name, description) VALUES ('${firstProject}', 'First project');
INSERT INTO project_access (project_id, user_id) VALUES (1, 1);
INSERT INTO project_container_settings (project_id, build_script, run_script, env_vars) VALUES (1, '', 'npm install && npm start', 'EXAMPLE_VAR=example value\\n');
`;

  writeFileSync(`./data/seed.sql`, seed);

  try {
    execSync(`sqlite3 ./data/data.sqlite3 ".read ./data/seed.sql"`);
  } catch (e) {
    // irrelevant
  }

  await runContainer(firstProject);
}

/**
 * As last step, create an .env file for the user if they don't already have one.
 */
async function setupEnv() {
  if (existsSync(`.env`)) return;

  let randomSecret = ``;
  while (randomSecret.length < 40) {
    randomSecret += String.fromCharCode(0x29 + (((0x7e - 0x29) * Math.random()) | 0));
  }

  console.log(`
For now, we're using GitHub as our oauth mediator, so you'll need to have
a GitHub application defined over on https://github.com/settings/developers

Create a new OAuth app if you don't have one already set up; for the
homepage url, give it "https://editor.com.localhost", and as authorization
callback url, give it "https://editor.com.localhost/auth/github/callback".

Once saved, generate a client secret, and then fill in the client id
and secrets here: they'll get saved to an untracked .env file that the
codebase will read in every time it starts up.
`)

  const GITHUB_CLIENT_ID = (await question(`Github client id? `)).trim();
  const GITHUB_CLIENT_SECRET = (
    await question(`Github client secret? `)
  ).trim();

  writeFileSync(
    `.env`,
    `SESSION_SECRET=${randomSecret}
GITHUB_CLIENT_ID=${GITHUB_CLIENT_ID}
GITHUB_CLIENT_SECRET=${GITHUB_CLIENT_SECRET}
GITHUB_APP_HOST=https://editor.com.localhost
GITHUB_CALLBACK_URL=https://editor.com.localhost/auth/github/callback
`
  );
}
