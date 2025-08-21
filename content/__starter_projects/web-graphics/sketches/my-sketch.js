function setup() {
  setSize(600, 400);
}

function draw() {
  clear(`white`);
  setColor(`black`);
  center();
  text(`my ${playing ? `playing ` : ``}sketch`, 0,0)
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
