const walls = [];
const balls = [];
const inset = 20;

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
    new Line(x2, y1, x1, y1)
  );
  // And then we'll put some balls in there:
  balls.push(
    new Ball(random(x1, x2), random(y1, y2), `gold`, 15),
    new Ball(random(x1, x2), random(y1, y2), `orange`, 10),
    new Ball(random(x1, x2), random(y1, y2), `red`, 5)
  );
  // Then, once our setup is done, hit play!
  play();
}

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
  for (const b of balls) b.update(walls, balls);
}

function pointerDown(x, y) {
  const b = balls[0];
  const dx = x - b.x;
  const dy = y - b.y;
  b.shoot(dx, dy);
}
