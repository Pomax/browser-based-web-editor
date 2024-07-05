import { watch } from "fs";
import { spawnSync } from "child_process";

const isWindows = process.platform === `win32`;
const npm = isWindows ? `npm.cmd` : `npm`;

/**
 * There's a few files we want to watch in order to rebuild the browser bundle.
 */
export function watchForRebuild() {
  [
    `./src/script.js`,
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
