/**
 * A "ball" class, modelling a round thing that can roll
 * across the field and hit walls and other balls.
 */
class Ball {
  f = 0.95; // our ball will "slowly slow down" as it travels across the field

  // a ball's initial velocity is zero. It just sits there.
  vx = 0;
  vy = 0;

  constructor(x, y, c = `red`, r = 15) {
    Object.assign(this, { x, y, c, r });
  }

  draw() {
    setStroke(`black`);
    setFill(this.c);
    circle(this.x, this.y, this.r);
  }

  shoot(vx, vy) {
    this.vx += vx / this.r;
    this.vy += vy / this.r;
  }

  update(lines, balls) {
    // get our old position
    const { x, y } = this;

    // Move the ball based on its speed
    this.x += this.vx;
    this.y += this.vy;

    // And reduce its speed a little (simulating friction)
    this.vx *= this.f;
    this.vy *= this.f;

    if (abs(this.vx) < 0.001) this.vx = 0;
    if (abs(this.vy) < 0.001) this.vy = 0;

    // then get our new position
    const { x: nx, y: ny } = this;

    // did we collide with a wall? If so, bounce.
    for (const l of lines) l.resolveCollision(this, x, y, nx, ny);

    // did we collide with another ball?
    if (this.vx !== 0 || this.vy !== 0) {
      for (const b of balls) {
        if (b === this) continue;
        resolveBallCollision(this, b);
      }
    }
  }
}
