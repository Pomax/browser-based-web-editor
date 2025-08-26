import { readFileSync, writeFileSync } from "node:fs";
import { execSync, spawn } from "node:child_process";
import { join } from "node:path";

console.log(`local path: ${import.meta.dirname}`);

const caddyFile = join(import.meta.dirname, `Caddyfile`);
const defaultCaddyFile = join(import.meta.dirname, `Caddyfile.default`);

/**
 * Create (or reset) our Caddyfile
 */
export function setupCaddy(env = process.env) {
  const config = readFileSync(defaultCaddyFile)
    .toString()
    .replace(`$WEB_EDITOR_HOSTNAME`, env.WEB_EDITOR_HOSTNAME)
    .replace(`$WEB_EDITOR_APPS_HOSTNAME`, `*.${env.WEB_EDITOR_APPS_HOSTNAME}`)
    .replace(`$WEB_EDITOR_APP_SECRET`, env.WEB_EDITOR_APP_SECRET);
  writeFileSync(caddyFile, config);
}

/**
 * Ensure a local Caddyfile exists for us to work with
 */
export function startCaddy() {
  stopCaddy();

  const DEBUG = readFileSync(caddyFile)
    .toString()
    .match(/{[\s\r\n]*debug[\s\r\n]*}/);

  spawn(`caddy`, [`start`, `--config`, caddyFile], {
    shell: true,
    stdio: DEBUG ? `inherit` : `ignore`,
  });
}

/**
 * Stop caddy.
 */
export function stopCaddy() {
  // TODO: this should honestly run until there's no caddy process left
  // in the process list, but that needs to happen in a cross-platform,
  // dependeny-cless way.
  try {
    execSync(`caddy stop`, { shell: true, stdio: `inherit` });
    execSync(`caddy stop`, { shell: true, stdio: `inherit` });
    execSync(`caddy stop`, { shell: true, stdio: `inherit` });
    execSync(`caddy stop`, { shell: true, stdio: `inherit` });
    execSync(`caddy stop`, { shell: true, stdio: `inherit` });
  } catch (e) {}
}

// When someone ctrl-c's a running instance, stop caddy (a few times) first.
process.on("SIGINT", () => {
  stopCaddy();
  process.exit();
});

/**
 * Set  up a binding for a named project
 * @param {*} name
 * @param {*} port
 */
export function updateCaddyFile(name, port, env = process.env) {
  const data = readFileSync(caddyFile).toString();
  const host = `${name}.${env.WEB_EDITOR_APPS_HOSTNAME}`;
  const index = data.indexOf(host);
  if (index >= 0) {
    // Update the binding
    const mark = `reverse_proxy localhost:`;
    const pos = data.indexOf(mark, index);
    if (pos !== -1) {
      const prefix = data.substring(0, pos);
      const suffix = data.substring(pos).replace(/:\d+/, `:${port}`);
      writeFileSync(caddyFile, prefix + suffix);
    }
  } else {
    // Create a new binding
    const entry = `\n${host} {\n\treverse_proxy localhost:${port}\n\timport proxy_error_handling\n}\n`;
    writeFileSync(caddyFile, data + entry);
  }

  spawn(`caddy`, [`reload`, `--config`, caddyFile], {
    shell: true,
    stdio: `ignore`,
  });
}

/**
 * Remove an entry from the Caddyfile
 * @param {*} name
 */
export function removeCaddyEntry(name) {
  const re = new RegExp(`\n${name}\\.app\\.localhost \\{[^}]+\\}\n`, `gm`);
  const data = readFileSync(caddyFile).toString().replace(re, ``);
  writeFileSync(caddyFile, data);
  spawn(`caddy`, [`reload`, `--config`, caddyFile], {
    shell: true,
    // stdio: `inherit`,
  });
}
