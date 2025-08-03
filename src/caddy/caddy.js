import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { execSync, spawn } from "node:child_process";

const caddyFile = `${import.meta.dirname}/Caddyfile`;

/**
 * Ensure a local Caddyfile exists for us to work with
 */
export function startCaddy() {
  if (!existsSync(caddyFile)) {
    writeFileSync(
      caddyFile,
      `editor.com.localhost {\n  reverse_proxy localhost:8000\n}\n`
    );
  }
  stopCaddy();
  spawn(`caddy`, [`start`, `--config`, caddyFile], {
    shell: true,
    stdio: `inherit`,
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
export function updateCaddyFile(name, port) {
  const data = readFileSync(caddyFile).toString();
  const host = `${name}.app.localhost`;
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
    const entry = `\n${host} {\n\treverse_proxy localhost:${port}\n}\n`;
    writeFileSync(caddyFile, data + entry);
  }
  spawn(`caddy`, [`reload`, `--config`, caddyFile], {
    shell: true,
    stdio: `inherit`,
  });
}

/**
 * Remove an entry from the Caddyfile
 * @param {*} name
 */
export function removeCaddyEntry(name) {
  const re = new RegExp(`${name}\\.app\\.localhost \\{[^}]+\\}\n\n?`, `gm`);
  const data = readFileSync(caddyFile).toString().replace(re, ``);
  writeFileSync(caddyFile, data);
  spawn(`caddy`, [`reload`, `--config`, caddyFile], {
    shell: true,
    stdio: `inherit`,
  });
}
