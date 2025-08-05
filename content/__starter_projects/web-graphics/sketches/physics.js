/**
 * Find the intersection between two lines, one defined by
 * (x1,y1)--(x2,y2) and the other defined by (x3,y3)--(x4,y4)
 *
 * If there is an intersection it'll return the [x,y] for
 * that intersection, otherwise it returns "undefined".
 */
function findIntersection(x1, y1, x2, y2, x3, y3, x4, y4) {
  const d = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
  if (d === 0) return;
  const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / d;
  const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / d;
  if (ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1) {
    return [x1 + ua * (x2 - x1), y1 + ua * (y2 - y1)];
  }
}

/**
 * Reflect a point (x,y) across a line defined by (x1,y1)--(x2,y2)
 * returning the [x,y] corresponding to the reflected points.
 */
function reflectPoint(x, y, x1, y1, x2, y2) {
  if (x1 === x2) return [2 * x1 - x, y];
  if (y1 === y2) return [x, 2 * y1 - y];
  const m = (y2 - y1) / (x2 - x1);
  const b = y1 - m * x1;
  const mp = -1 / m;
  const bp = y - mp * x;
  const xi = (bp - b) / (m - mp);
  const yi = m * xi + b;
  return [2 * xi - x, 2 * yi - y];
}

/**
 * Resolve a collision (if there is on!) between two balls b1 and b2
 */
function resolveBallCollision(b1, b2) {
  const [dx, dy] = [b2.x - b1.x, b2.y - b1.y];
  const D = (dx ** 2 + dy ** 2) ** 0.5;
  const R = b1.r + b2.r;
  if (D > R) return;

  const [nx, ny] = [dx / D, dy / D];
  const [f1, f2] = [b2.r / R, b1.r / R];
  b1.vx -= f1 * nx;
  b1.vy -= f1 * ny;
  b2.vx += f2 * nx;
  b2.vy += f2 * ny;
}
