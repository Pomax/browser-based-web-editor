import { getInitialState, setupView } from "./code-mirror-6.js";
import { getViewType, verifyViewType } from "../content-types.js";
import { fetchFileContents, create } from "../utils.js";
import { syncContent } from "../sync.js";

const tabs = document.getElementById(`tabs`);
const editors = document.getElementById(`editors`);

/**
 * Create the editor's on-page container
 */
export function setupEditorPanel(filename) {
  const panel = create(`div`);
  panel.id = filename;
  panel.title = filename;
  panel.classList.add(`editor`, `tab`);
  return panel;
}

/**
 * Create an editor's associated "tab" in the tab row
 */
export function setupEditorTab(filename) {
  const tab = create(`div`);
  tab.title = filename;
  tab.textContent = filename;
  // TODO: make tabs draggable so users can reorder them
  document
    .querySelectorAll(`.active`)
    .forEach((e) => e.classList.remove(`active`));
  tab.classList.add(`tab`, `active`);

  const close = create(`button`);
  close.textContent = `x`;
  close.classList.add(`close`);
  tab.appendChild(close);

  return { tab, close };
}

/**
 * Add all the event handling we're using in this experiment:
 * tabs should trigger the editor they're associated with and mark themselves as active,
 * close buttons should remove the UI elements associated with an editor.
 * @param {*} filename
 * @param {*} panel
 * @param {*} tab
 * @param {*} close
 * @param {*} view
 */
export function addEditorEventHandling(
  fileEntry,
  cmInstances,
  filename,
  panel,
  tab,
  close,
  view
) {
  tab.addEventListener(`click`, () => {
    if (!fileEntry.state) return;
    if (!fileEntry.parentNode) {
      // TODO: we should select a different tab, this file got deleted.
      return document.querySelector(`div.tab`).click();
    }
    fileEntry.select();
    document
      .querySelectorAll(`.editor`)
      .forEach((e) => e.setAttribute(`hidden`, `hidden`));
    panel.removeAttribute(`hidden`);
    document
      .querySelectorAll(`.active`)
      .forEach((e) => e.classList.remove(`active`));
    tab.classList.add(`active`);
    tab.scrollIntoView();
    view.focus();
  });

  close.addEventListener(`click`, () => {
    if (tab.classList.contains(`active`)) {
      const tabs = Object.keys(cmInstances);
      const tabPos = tabs.indexOf(tab.title);
      let newTab = tabPos === 0 ? tabs[1] : tabs[tabPos - 1];
      // newTab might exist as entry but not have an editor associated with it.
      if (newTab) {
        fileEntry.state.tab?.click();
      } else {
        filetree.unselect();
      }
    }
    tab.remove();
    panel.remove();
    // get current label
    const label = [...tab.childNodes].find(
      (c) => c.nodeName === `#text`
    ).textContent;
    fileEntry.state = {};
  });
}

/**
 * Create the collection of page UI elements and associated editor
 * component for a given file.
 */
export async function getOrCreateFileEditTab(
  fileEntry,
  cmInstances,
  contentDir,
  filename
) {
  const entry = fileEntry.state;

  if (entry?.view) {
    return entry.tab?.click();
  }

  const panel = setupEditorPanel(filename);
  editors.appendChild(panel);

  const { tab, close } = setupEditorTab(filename);
  tabs.appendChild(tab);

  // Is this text or viewable media?
  const viewType = getViewType(filename);
  const data = await fetchFileContents(contentDir, filename, viewType.type);
  const verified = verifyViewType(viewType.type, data);

  if (!verified) return alert(`File contents does not match extension.`);

  let view;
  if (viewType.text || viewType.unknown) {
    const initialState = getInitialState(
      fileEntry,
      cmInstances,
      filename,
      data
    );
    view = setupView(panel, initialState);
  } else if (viewType.media) {
    const { type } = viewType;
    if (type.startsWith(`image`)) {
      view = create(`img`);
    } else if (type.startsWith(`audio`)) {
      view = create(`audio`);
    } else if (type.startsWith(`video`)) {
      view = create(`video`);
    }
    view.src = `${contentDir}/${filename}`;
    panel.appendChild(view);
  }

  // FIXME: this feels like a hack, but there doesn't appear to be
  //        a clean way to associate data with an editor such that
  //        the onChange handler can access the right key...
  view.tabElement = tab;

  // Add tab and tab-close event hanlding:
  addEditorEventHandling(
    fileEntry,
    cmInstances,
    filename,
    panel,
    tab,
    close,
    view
  );

  // Track this collection
  const properties = {
    filename,
    tab,
    close,
    panel,
    view,
    content: viewType.editable ? view.state.doc.toString() : data,
    sync: () => {
      if (viewType.editable) {
        const entry = fileEntry.state;
        syncContent(entry, contentDir);
      }
    },
    noSync: !viewType.editable,
  };

  if (entry) {
    Object.assign(entry, properties);
  } else {
    fileEntry.setState(properties);
  }

  // And activate this editor
  tab.click();
}
