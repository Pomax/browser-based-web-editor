function setup() {
  setSize(600, 400);
}

function draw() {
  clear(`white`);
  setColor(`black`);
}

function keyDown(key) {
  if (key === ` `) {
    if (playing) {
      pause();
    } else {
      play();
    }
  }
}
