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
function resolveBallCollision(b1, b2, lines) {
  const m1 = b1.r;
  const m2 = b2.r;
  const R = m1 + m2;
  const p1 = b1.prev;
  const p2 = b2.prev;

  // We'll subdivide the frame into 100 subframes.
  let p1x, p1y, p2x, p2y, d, f, collision;
  for (let i = 0; i < 100; i++) {
    f = i / 99;
    p1x = p1.x + f * p1.vx;
    p1y = p1.y + f * p1.vy;
    p2x = p2.x + f * p2.vx;
    p2y = p2.y + f * p2.vy;
    d = dist(p1x, p1y, p2x, p2y);
    if (d < R) {
      collision = true;
      break;
    }
  }

  // If there was no collision along the paths, we're done.
  if (!collision) return;

  // However, if there was, we need to resolve our positions
  // and velocities. First up, "halt" our balls at the point
  // of collision and update their positions and velocities:
  b1.x = p1x;
  b1.y = p1y;
  b1.vx = (1 - f) * p1.vx + f * b1.vx;
  b1.vy = (1 - f) * p1.vy + f * b1.vy;

  b2.x = p2x;
  b2.y = p2y;
  b2.vx = (1 - f) * p2.vx + f * b2.vx;
  b2.vy = (1 - f) * p2.vy + f * b2.vy;

  // then we need to "transfer" velocities as described in
  // the "Two-dimensional collision with two moving objects"
  // section on https://en.wikipedia.org/wiki/Elastic_collision
  const f1 = (2 * m2) / R;
  const f2 = (2 * m1) / R;
  const x12 = [p1x - p2x, p1y - p2y];
  const v12 = [b1.vx - b2.vx, b1.vy - b2.vy];
  const d12 = v12[0] * x12[0] + v12[1] * x12[1];
  const x21 = [-x12[0], -x12[1]];
  const v21 = [-v12[0], -v12[1]];
  const d21 = v21[0] * x21[0] + v21[1] * x21[1];
  const mag = x12[0] ** 2 + x12[1] ** 2;

  // In order to make sure our balls don't get stuck "glued"
  // together, we'll need to space them out just a tiny bit
  // as part of the final collision resolution:
  const m = mag ** 0.5
  b1.x -= x21[0] / m;
  b1.y -= x21[1] / m;
  b2.x += x21[0] / m;
  b2.y += x21[1] / m;

  // And then we can run the post-collision physics:
  b1.vx = b1.vx - ((f1 * d12) / mag) * x12[0];
  b1.vy = b1.vy - ((f1 * d12) / mag) * x12[1];
  b1.update(lines);

  b2.vx = b2.vx - ((f2 * d21) / mag) * x21[0];
  b2.vy = b2.vy - ((f2 * d21) / mag) * x21[1]; 
  b2.update(lines);

  // Note that this is still a "toy" collision solver,
  // as we could technically still push balls inside
  // of other balls, and if we're really careful, even
  // past walls. The "real" solution is to not check
  // collisions frame by frame, but solving the entire
  // colliision tree "up front" based on velocities in
  // pixels per second, rather than pixels per frame,
  // and then "playing that back" while the sketch
  // runs its draw loop, either until we've finished
  // the play back, or the user interrupts it with new
  // input, at which point we need to redo our work.
}
