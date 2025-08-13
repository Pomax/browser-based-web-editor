// Let's set up our lists for walls and balls, and
// make sure we draw our walls inside a little so
// we can see the "playing field edges":
const walls = [];
const balls = [];
const ballCount = 20;
const inset = 20;

/**
 * Then, our most important function: our setup.
 * Here we build our initial set of actual walls
 * and balls, getting everything ready to start
 * animating.
 */
function setup() {
  setSize(600, 400);
  const x1 = inset - 1;
  const x2 = width - inset + 1;
  const y1 = inset - 1;
  const y2 = height - inset + 1;
  // Let's build a box for our balls to live inside of:
  walls.push(
    new Line(x1, y1, x1, y2),
    new Line(x1, y2, x2, y2),
    new Line(x2, y2, x2, y1),
    new Line(x2, y1, x1, y1),
  );
  // And then we'll put some balls in there:
  for (let i = 0; i < ballCount; i++) {
    balls.push(
      new Ball(
        random(x1, x2),
        random(y1, y2),
        `rgb(255,${225 - 15 * i},${15 * i})`,
        ballCount + 1 - i,
      ),
    );
  }
  // Then, once our setup is done, hit play!
  play();
}

/**
 * As long as we're playing, this function will
 * keep getting called, making sure to first draw
 * our "game state", and then triggering a physics
 * update pass, where balls get repositioned based
 * on their velocities, and we resolve collisions.
 */
function draw() {
  clear(`white`);
  noFill();
  setColor(`#0405`);
  rect(inset, inset, width - 2 * inset, height - 2 * inset);

  // Draw our "aim line":
  const [t] = balls;
  const aim = new Line(t.x, t.y, pointer.x, pointer.y);
  aim.draw();

  // Then draw our walls and balls:
  for (const w of walls) w.draw();
  for (const b of balls) b.draw();

  // And then see if we need to physics anything!
  for (const b of balls) b.update(walls);

  // We first update all our balls, then we check to
  // see if those updates caused any collisionts that
  // we need to resolve.
  for (const b of balls) b.resolveBallCollisions(balls, walls);
}

/**
 * In order for the user to control this little
 * physics simulation, we want to listen for a
 * "pointer down" event. The pointer can be a mouse
 * or a finger: by not caring which it is we can
 * make our graphics work on desktop *and* mobile.
 */
function pointerDown(x, y) {
  const b = balls[0];
  const dx = x - b.x;
  const dy = y - b.y;
  b.shoot(dx, dy);
}
