/**
 * A "wall" that _should_ be impenetrable, making
 * balls bounce off them instead of just passing
 * through them.
 */
class Line {
  f = 0.9; // every bounce loses some energy

  constructor(x1, y1, x2, y2, c = `black`) {
    Object.assign(this, { x1, y1, x2, y2, c });
  }

  draw() {
    setStroke(this.c);
    line(this.x1, this.y1, this.x2, this.y2);
  }

  resolveCollision(ball, x, y, nx, ny) {
    let { x1, y1, x2, y2 } = this;
    // is there a collision?
    const i = findIntersection(x1, y1, x2, y2, /* and */ x, y, nx, ny);
    if (!i) return;
    // resolve collision position
    const [xr, yr] = reflectPoint(nx, ny, /* over */ x1, y1, x2, y2);
    ball.x = xr;
    ball.y = yr;
    // and collision force
    const m = this.f * (ball.vx ** 2 + ball.vy ** 2) ** 0.5;
    const [xi, yi] = i;
    const [vx, vy] = [xr - xi, yr - yi];
    const mn = (vx ** 2 + vy ** 2) ** 0.5;
    const s = m / mn;
    ball.vx = s * vx;
    ball.vy = s * vy;
  }
}
