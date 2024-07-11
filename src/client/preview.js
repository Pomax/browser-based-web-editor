const preview = document.getElementById(`preview`);

/**
 * update the <graphics-element> based on the current file content.
 */
export function updatePreview() {
  const iframe = preview.querySelector(`iframe`);
  const newFrame = document.createElement(`iframe`);
  newFrame.onload = () => {
    setTimeout(() => {
      newFrame.style.opacity = 1;
      setTimeout(() => iframe.remove(), 750);
    }, 250);
  };
  newFrame.style.opacity = 0;
  newFrame.style.transition = "opacity 0.25s";
  preview.append(newFrame);
  const src = iframe.src ? iframe.src : iframe.dataset.src;
  newFrame.src = src;
}
