import { existsSync, readFileSync, writeFile, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";

const caddyFile = `./Caddyfile`;

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
  spawn(`caddy`, [`start`], { shell: true, stdio: `inherit` });
}

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
    const entry = `\n${host} {\n  reverse_proxy localhost:${port}\n}\n`;
    writeFileSync(caddyFile, data + entry);
  }
  spawn(`caddy`, [`reload`], { shell: true, stdio: `inherit` });
}
