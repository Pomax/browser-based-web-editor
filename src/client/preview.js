const preview = document.getElementById(`preview`);

let first_time_load = true;

/**
 * update the <graphics-element> based on the current file content.
 */
export function updatePreview() {
  // Not a fan of this little "oh, hold on!" check, but
  // "it works" and gets around a docker timing issue for now.
  if (first_time_load) {
    console.log(`delaying first time load`);
    first_time_load = false;
    return setTimeout(() => updatePreview(), 1000);
  }

  const iframe = preview.querySelector(`iframe`);
  const newFrame = document.createElement(`iframe`);

  newFrame.onerror = () => {
    console.log(`what?`, e);
  };

  newFrame.onload = () => {
    console.log(`loaded ${newFrame.src}`);
    setTimeout(() => (newFrame.style.opacity = 1), 250);
    setTimeout(() => iframe.remove(), 500);
  };

  newFrame.style.opacity = 0;
  newFrame.style.transition = "opacity 0.25s";
  let src = iframe.src ? iframe.src : iframe.dataset.src;
  src = src.replace(/\?v=\d+/, ``);
  src += `?v=${Date.now()}`;

  console.log(`using ${src}`);
  preview.append(newFrame);
  setTimeout(() => (newFrame.src = src), 100);
}
