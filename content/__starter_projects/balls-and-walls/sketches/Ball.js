/**
 * A "ball" class, modelling a round thing that can roll
 * across the field and hit walls and other balls.
 */
class Ball {
  f = 0.95; // our ball will "slowly slow down" as it travels across the field

  // a ball's initial velocity is zero. It just sits there.
  vx = 0;
  vy = 0;

  // In order to track previous positions and forced... do that
  prev = { vx: 0, vy: 0 };

  constructor(x, y, c = `red`, r = 15) {
    Object.assign(this, { x, y, c, r });
    this.prev.x = x;
    this.prev.y = y;
  }

  draw() {
    const { x, y, vx, vy } = this;
    setStroke(`black`);
    setFill(this.c);
    circle(this.x, this.y, this.r);
  }

  shoot(vx, vy) {
    this.vx += vx / 5;
    this.vy += vy / 5;
  }

  update(lines = []) {
    const { prev, x, y, vx, vy, f } = this;

    // If there are no forces acting on this
    // ball, there's nothing to update.
    if (vx === 0 && vy === 0) return;

    // cache our old position and forces
    Object.assign(prev, { x, y, vx, vy });

    // Move the ball based on its speed
    this.x += vx;
    this.y += vy;

    // And reduce its speed a little (simulating friction)
    this.vx *= f;
    this.vy *= f;

    // Then, let's prevent infinite multiplication:
    if (abs(this.vx) < 0.001) this.vx = 0;
    if (abs(this.vy) < 0.001) this.vy = 0;

    // then get our new position
    const { x: nx, y: ny } = this;

    // did we collide with a wall? If so, bounce.
    for (const l of lines) l.resolveCollision(this, x, y, nx, ny);
  }

  resolveBallCollisions(balls, lines) {
    for (const b of balls) {
      if (b === this) continue;
      resolveBallCollision(this, b, lines);
    }
  }
}
