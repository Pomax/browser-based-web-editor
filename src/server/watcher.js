import { watch } from "fs";
import { spawnSync } from "child_process";

const isWindows = process.platform === `win32`;
const npm = isWindows ? `npm.cmd` : `npm`;

/**
 * There's a few files we want to watch in order to rebuild the browser bundle.
 */
export function watchForRebuild() {
  [
    `./src/client/cm6/code-mirror-6.js`,
    `./src/client/cm6/editor-components.js`,
    `./src/client/cm6/event-handling.js`,
    `./src/client/cm6/file-tree-utils.js`,
    `./src/client/api.js`,
    `./src/client/content-types.js`,
    `./src/client/default-files.js`,
    `./src/client/preview.js`,
    `./src/client/script.js`,
    `./src/client/sync.js`,
    `./src/client/utils.js`,
  ].forEach((filename) => watch(filename, () => rebuild()));
  rebuild();
}

/**
 * Trigger a rebuild by telling npm to run the `build` script from package.json.
 */
function rebuild() {
  console.log(`rebuilding`);
  const start = Date.now();
  spawnSync(npm, [`run`, `build`], {
    stdio: `inherit`,
  });
  console.log(`Build took ${Date.now() - start}ms`), 8;
}
