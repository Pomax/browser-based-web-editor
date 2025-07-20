import net from "net";

export const isWindows = process.platform === `win32`;
export const npm = isWindows ? `npm. cmd` : `npm`;

/**
 * Used for docker binding
 */
export function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, () => {
      const { port } = server.address();
      server.close((err) => (err ? reject(err) : resolve(port)));
    });
  });
}
