const restart = document.querySelector(`#preview-buttons .restart`);
const newtab = document.querySelector(`#preview-buttons .newtab`);
const preview = document.getElementById(`preview`);

let first_time_load = 0;

/**
 * update the <graphics-element> based on the current file content.
 */
export async function updatePreview() {
  const iframe = preview.querySelector(`iframe`);
  const newFrame = document.createElement(`iframe`);

  if (first_time_load++ < 10) {
    console.log(`checking container for ready`);
    const status = await fetch(
      `https://editor.com.localhost/project/health/${iframe.dataset.projectName}?v=${Date.now()}`
    ).then((r) => r.text());
    console.log(`result: ${status}`);
    if (status === `failed`) {
      return console.error(`Project failed to start. That's bad`);
    } else if (status === `not running` || status === `wait`) {
      return setTimeout(updatePreview, 1000);
    }
  }

  newFrame.onerror = () => {
    console.log(`what?`, e);
  };

  newFrame.onload = () => {
    console.log(`loaded ${newFrame.src}`);
    setTimeout(() => (newFrame.style.opacity = 1), 250);
    setTimeout(() => iframe.remove(), 500);
  };

  newFrame.style.opacity = 0;
  let src = iframe.dataset.src;
  src = src.replace(/\?v=\d+/, ``);
  src += `?v=${Date.now()}`;
  newFrame.dataset.src = src;
  newFrame.dataset.projectName = iframe.dataset.projectName;

  console.log(`using ${src}`);
  preview.append(newFrame);
  setTimeout(() => (newFrame.src = src), 100);
}

restart?.addEventListener(`click`, async () => {
  preview.classList.add(`restarting`);
  await fetch(`/restart`, { method: `POST` });
  setTimeout(() => {
    preview.classList.remove(`restarting`);
    updatePreview();
  }, 1000);
});

newtab?.addEventListener(`click`, async () => {
  const iframe = preview.querySelector(`iframe`);
  const link = document.createElement(`a`);
  link.href = iframe.src.replace(/\?v=\d+/, ``);
  link.target = `_blank`;
  link.click();
});
