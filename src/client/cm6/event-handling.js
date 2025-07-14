import { fetchFileContents, fetchSafe } from "../utils.js";

const changeUser = document.getElementById(`switch`);
const all = document.getElementById(`all`);
const format = document.getElementById(`format`);
const left = document.getElementById(`left`);
const right = document.getElementById(`right`);

/**
 * Hook up the "Add new file" and "Format this file" buttons
 */
export function addEventHandling(cmInstances, contentDir) {
  changeUser.addEventListener(`click`, async () => {
    const name = prompt(`Username?`).trim();
    if (name) {
      const result = await fetchSafe(`/login/${name}`, { method: `post` });
      if (result instanceof Error) return;
      location.reload();
    }
  });

  all.addEventListener(`click`, async () => {
    document.querySelectorAll(`file-entry`).forEach((e) => e.click());
  });

  addTabScrollHandling();

  format.addEventListener(`click`, async () => {
    const tab = document.querySelector(`.active`);
    const entry = Object.values(cmInstances).find((e) => e.tab === tab);
    const filename = entry.filename;
    format.hidden = true;
    const result = await fetchSafe(`/format/${filename}`, { method: `post` });
    if (result instanceof Error) return;
    entry.content = await fetchFileContents(contentDir, filename);
    format.hidden = false;
    entry.view.dispatch({
      changes: {
        from: 0,
        to: entry.view.state.doc.length,
        insert: entry.content,
      },
    });
  });
}

/**
 * Basic tab scrolling: click/touch-and-hold
 */
function addTabScrollHandling() {
  let scrolling = false;

  function scrollTabs(step) {
    if (!scrolling) return;
    tabs.scrollBy(step, 0);
    setTimeout(() => scrollTabs(step), 4);
  }

  for (const type of [`mouseup`, `touchend`]) {
    document.addEventListener(type, () => (scrolling = false));
  }

  for (const type of [`mouseout`, `touchend`]) {
    left.addEventListener(type, () => (scrolling = false));
    right.addEventListener(type, () => (scrolling = false));
  }

  for (const type of [`mousedown`, `touchstart`]) {
    left.addEventListener(type, () => {
      scrolling = true;
      scrollTabs(-2);
    });
    right.addEventListener(type, () => {
      scrolling = true;
      scrollTabs(2);
    });
  }
}
