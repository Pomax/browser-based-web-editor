import { fetchFileContents } from "../utils.js";
import { API } from "../api.js";

const changeProject = document.getElementById(`switch`);
const all = document.getElementById(`all`);
const format = document.getElementById(`format`);
const left = document.getElementById(`left`);
const right = document.getElementById(`right`);

/**
 * Hook up the "Add new file" and "Format this file" buttons
 */
export function addEventHandling(projectName) {
  changeProject.addEventListener(`click`, async () => {
    const name = prompt(`Project name?`).trim();
    if (name) {
      location = `${location.toString().replace(location.search, ``)}?project=${name}`;
    }
  });

  all.addEventListener(`click`, async () => {
    document.querySelectorAll(`file-entry`).forEach((e) => e.click());
  });

  addTabScrollHandling();

  format.addEventListener(`click`, async () => {
    const tab = document.querySelector(`.active`);
    const fileEntry = document.querySelector(`file-entry.selected`);
    if (fileEntry.state?.tab !== tab) {
      throw new Error(`active tab has no associated selected file? O_o`);
    }
    const fileName = fileEntry.path;
    format.hidden = true;
    const result = await API.files.format(projectName, fileName);
    if (result instanceof Error) return;
    format.hidden = false;
    const { view } = fileEntry.state;
    const content = await fetchFileContents(projectName, fileName);
    fileEntry.setState({ content });
    view.dispatch({
      changes: {
        from: 0,
        to: view.state.doc.length,
        insert: content,
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
