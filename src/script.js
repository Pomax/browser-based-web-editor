// This test script uses Codemirror v6
import { basicSetup, EditorView } from "codemirror";
import { EditorState } from "@codemirror/state";

// Language-specific features:
import { css } from "@codemirror/lang-css";
import { html } from "@codemirror/lang-html";
import { javascript } from "@codemirror/lang-javascript";
import { markdown } from "@codemirror/lang-markdown";
// See https://github.com/orgs/codemirror/repositories?q=lang for more options

import { createPatch } from "../public/vendor/diff.js";
import "../public/file-tree/index.js";

// This is *technically* unnecessary, but it's better to be explicit.
const changeUser = document.getElementById(`switch`);
const all = document.getElementById(`all`);
const format = document.getElementById(`format`);
const left = document.getElementById(`left`);
const right = document.getElementById(`right`);
const filetree = document.getElementById(`filetree`);
const tabs = document.getElementById(`tabs`);
const editors = document.getElementById(`editors`);
const preview = document.getElementById(`preview`);

const user = document.querySelector(`.username`)?.textContent;
let CONTENT_DIR = `content/${user ?? `anonymous`}`;
const cmInstances = {};

// Let's try to load our content!
await setupPage();

/**
 * Our main entry point
 */
async function setupPage() {
  await setupFileTree();
  addGlobalEventHandling();
  updatePreview();
}

/**
 * helper function for getting file text content:
 */
async function fetchFileContents(filename) {
  return fetchSafe(`./${CONTENT_DIR}/${filename}`).then((r) => r.text());
}

/**
 * helper function for making sure we automatically reload in case the fetch
 * comes back with a catastrophic "I restarted and you need to reload the page"
 */
async function fetchSafe(url, options) {
  const response = await fetch(url, options);
  if (response.status !== 200) {
    if (response.headers.get(`x-reload-page`)) {
      alert(`Your session expired, please reload.\n(error code: 29X784FH)`);
      throw new Error(`Page needs reloading`);
    }
  }
  return response;
}

/**
 * Make sure we're in sync with the server...
 */
async function setupFileTree() {
  const dirData = await fetchSafe(`/dir`).then((r) => r.json());
  document.querySelector(`file-tree`).setFiles(dirData);
  addFileTreeHandling();
}

/**
 * Hook up the "Add new file" and "Format this file" buttons
 */
function addGlobalEventHandling() {
  changeUser.addEventListener(`click`, async () => {
    const name = prompt(`Username?`).trim();
    if (name) {
      await fetchSafe(`/login/${name}`, { method: `post` });
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
    await fetchSafe(`/format/${filename}`, { method: `post` });
    entry.content = await fetchFileContents(filename);
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
 * Deal with all the events that might be coming from the file tree
 */
function addFileTreeHandling() {
  // TODO: lots of duplication happening here
  filetree.addEventListener(`filetree:file:click`, async (evt) => {
    const { fullPath, commit } = evt.detail;
    commit();
    getOrCreateFileEditTab(fullPath);
    // we handle selection in the file tree as part of editor reveals,
    // so we do not call the event's own commit() function.
  });

  filetree.addEventListener(`filetree:file:create`, async (evt) => {
    const { fileName, commit } = evt.detail;
    const response = await fetchSafe(`/new/${fileName}`, { method: `post` });
    if (response.status === 200) {
      const entry = commit();
      getOrCreateFileEditTab(entry.getAttribute(`path`));
    } else {
      console.error(`Could not create ${fileName} (status:${response.status})`);
    }
  });

  filetree.addEventListener(`filetree:file:rename`, async (evt) => {
    const { oldName, newName, commit } = evt.detail;
    const response = await fetchSafe(`/rename/${oldName}:${newName}`, {
      method: `post`,
    });
    if (response.status === 200) {
      commit();
      let key = oldName.replace(CONTENT_DIR, ``);
      const entry = cmInstances[key];
      if (entry) {
        // FIXME: DEDUPE, THIS CODE OCCURS FOUR TIMES NOW
        delete cmInstances[key];
        key = newName.replace(CONTENT_DIR, ``);
        cmInstances[key] = entry;
        const { tab, panel } = entry;
        entry.filename = key;
        tab.title = key;
        tab.childNodes.forEach((n) => {
          if (n.nodeName === `#text`) {
            n.textContent = key;
          }
        });
        panel.title = panel.id = key;
      }
    } else {
      console.error(
        `Could not rename ${oldName} to ${newName} (status:${response.status})`
      );
    }
    updatePreview();
  });

  filetree.addEventListener(`filetree:file:upload`, async (evt) => {
    const { fileName, content, commit } = evt.detail;
    const form = new FormData();
    form.append(`filename`, fileName);
    form.append(`content`, content);
    const response = await fetchSafe(`/upload/${fileName}`, {
      method: `post`,
      body: form,
    });
    if (response.status === 200) {
      commit();
    } else {
      console.error(`Could not upload ${fileName} (status:${response.status})`);
    }
    updatePreview();
  });

  filetree.addEventListener(`filetree:file:move`, async (evt) => {
    const { oldPath, newPath, commit } = evt.detail;
    const response = await fetchSafe(`/rename/${oldPath}:${newPath}`, {
      method: `post`,
    });
    if (response.status === 200) {
      commit();
      let key = oldPath.replace(CONTENT_DIR, ``);
      const entry = cmInstances[key];
      if (entry) {
        // FIXME: DEDUPE, THIS CODE OCCURS FOUR TIMES NOW
        delete cmInstances[key];
        key = newPath.replace(CONTENT_DIR, ``);
        cmInstances[key] = entry;
        const { tab, panel } = entry;
        entry.filename = key;
        tab.title = key;
        tab.childNodes.forEach((n) => {
          if (n.nodeName === `#text`) {
            n.textContent = key;
          }
        });
        panel.title = panel.id = key;
      }
    } else {
      console.error(
        `Could not move ${oldPath} to ${newPath} (status:${response.status})`
      );
    }
    updatePreview();
  });

  filetree.addEventListener(`filetree:file:delete`, async (evt) => {
    const { path: fileName, commit } = evt.detail;
    if (fileName) {
      try {
        const response = await fetchSafe(`/delete/${fileName}`, {
          method: `delete`,
        });
        if (response.status === 200) {
          commit();
          cmInstances[fileName]?.close?.click();
        } else {
          console.error(
            `Could not delete ${fileName} (status:${response.status})`
          );
        }
      } catch (e) {
        console.error(e);
      }
    }
    updatePreview();
  });

  filetree.addEventListener(`filetree:dir:create`, async (evt) => {
    const { dirName, commit } = evt.detail;
    const response = await fetchSafe(`/new/${dirName}`, { method: `post` });
    if (response.status === 200) {
      commit();
    } else {
      console.error(`Could not create ${dirName} (status:${response.status})`);
    }
  });

  filetree.addEventListener(`filetree:dir:rename`, async (evt) => {
    const { oldPath, newPath, commit } = evt.detail;
    const response = await fetchSafe(`/rename/${oldPath}:${newPath}`, {
      method: `post`,
    });
    if (response.status === 200) {
      const { oldPath, newPath } = commit();
      // update all cmInstances
      Object.entries(cmInstances).forEach(([key, entry]) => {
        if (key.startsWith(oldPath)) {
          // FIXME: DEDUPE, THIS CODE OCCURS FOUR TIMES NOW
          delete cmInstances[key];
          key = key.replace(oldPath, newPath);
          cmInstances[key] = entry;
          const { tab, panel } = entry;
          entry.filename = key;
          tab.title = key;
          tab.childNodes.forEach((n) => {
            if (n.nodeName === `#text`) {
              n.textContent = key;
            }
          });
          panel.title = panel.id = key;
          updatePreview();
        }
      });
    } else {
      console.error(
        `Could not rename ${oldPath} to ${newPath} (status:${response.status})`
      );
    }
    updatePreview();
  });

  filetree.addEventListener(`filetree:dir:move`, async (evt) => {
    const { oldPath, newPath, commit } = evt.detail;
    const response = await fetchSafe(`/rename/${oldPath}:${newPath}`, {
      method: `post`,
    });
    if (response.status === 200) {
      const { oldPath, newPath } = commit();
      // update all cmInstances
      Object.entries(cmInstances).forEach(([key, entry]) => {
        if (key.startsWith(oldPath)) {
          // FIXME: DEDUPE, THIS CODE OCCURS FOUR TIMES NOW
          delete cmInstances[key];
          key = key.replace(oldPath, newPath);
          cmInstances[key] = entry;
          const { tab, panel } = entry;
          entry.filename = key;
          tab.title = key;
          tab.childNodes.forEach((n) => {
            if (n.nodeName === `#text`) {
              n.textContent = key;
            }
          });
          panel.title = panel.id = key;
          updatePreview();
        }
      });
    } else {
      console.error(
        `Could not move ${oldPath} to ${newPath} (status:${response.status})`
      );
    }
    updatePreview();
  });

  filetree.addEventListener(`filetree:dir:delete`, async (evt) => {
    const { path, commit } = evt.detail;
    const response = await fetchSafe(`/delete-dir/${path}`, {
      method: `delete`,
    });
    if (response.status === 200) {
      commit();
    } else {
      console.error(`Could not delete ${path} (status:${response.status})`);
    }
    updatePreview();
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

/**
 * nicer than always typing document.createElement
 */
function create(tag) {
  return document.createElement(tag);
}

/**
 * A very dumb digest function that just sums the
 * bytes in a file. We don't care about collision, we just
 * care that it's good enough to signal that two files that
 * should be the same, are somehow not the same.
 */
function getFileSum(data) {
  const enc = new TextEncoder();
  return enc.encode(data).reduce((t, e) => t + e, 0);
}

/**
 * Create the collection of pqge UI elements and associated editor
 * component for a given file.
 */
async function getOrCreateFileEditTab(filename) {
  const entry = cmInstances[filename];
  if (entry?.view) {
    return entry.tab?.click();
  }

  const panel = setupEditorPanel(filename);
  editors.appendChild(panel);

  const { tab, close } = setupEditorTab(filename);
  tabs.appendChild(tab);

  const data = await fetchFileContents(filename);
  const initialState = getInitialState(filename, data);
  const view = setupView(panel, initialState);

  // FIXME: this feels like a hack, but there doesn't appear to be
  //        a clean way to associate data with an editor such that
  //        the onChange handler can access the right key...
  view.tabElement = tab;

  // Add tab and tab-close event hanlding:
  addEventHandling(filename, panel, tab, close, view);

  // Track this collection
  const properties = {
    filename,
    tab,
    close,
    panel,
    view,
    content: view.state.doc.toString(),
    sync: () => syncContent(tab.title),
  };

  if (entry) {
    Object.assign(entry, properties);
  } else {
    cmInstances[filename] = properties;
  }

  // And activate this editor
  tab.click();
}

/**
 * Create an initial CodeMirror6 state object
 */
function getInitialState(filename, data) {
  const doc = data.toString();
  const extensions = [basicSetup];

  // Can we add syntax highlighting?
  const ext = filename.substring(filename.lastIndexOf(`.`) + 1);
  const syntax = {
    css: css,
    html: html,
    js: javascript,
    md: markdown,
  }[ext];
  if (syntax) extensions.push(syntax());

  // Add debounced content change syncing
  extensions.push(
    EditorView.updateListener.of((e) => {
      const tab = e.view.tabElement;
      if (tab && e.docChanged) {
        const entry = cmInstances[tab.title];
        if (entry.debounce) {
          clearTimeout(entry.debounce);
        }
        entry.debounce = setTimeout(entry.sync, 1000);
      }
    })
  );

  return EditorState.create({ doc, extensions });
}

/**
 * Create the editor's on-page container
 */
function setupEditorPanel(filename) {
  const panel = create(`div`);
  panel.id = filename;
  panel.title = filename;
  panel.classList.add(`editor`, `tab`);
  return panel;
}

/**
 * Create an editor's associated "tab" in the tab row
 */
function setupEditorTab(filename) {
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
 * Set up a CodeMirror6 view
 */
function setupView(parent, state) {
  const view = new EditorView({ parent, state });
  return view;
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
function addEventHandling(filename, panel, tab, close, view) {
  tab.addEventListener(`click`, () => {
    if (!cmInstances[tab.title]) return;
    document
      .querySelectorAll(`.editor`)
      .forEach((e) => e.setAttribute(`hidden`, `hidden`));
    panel.removeAttribute(`hidden`);
    document
      .querySelectorAll(`.active`)
      .forEach((e) => e.classList.remove(`active`));
    tab.classList.add(`active`);
    tab.scrollIntoView();
    filetree.select(tab.title);
    view.focus();
  });

  close.addEventListener(`click`, () => {
    if (tab.classList.contains(`active`)) {
      const tabs = Object.keys(cmInstances);
      const tabPos = tabs.indexOf(tab.title);
      let newTab = tabPos === 0 ? tabs[1] : tabs[tabPos - 1];
      // newTab might exist as entry but not have an editor associated with it.
      if (newTab) cmInstances[newTab].tab?.click();
    }
    tab.remove();
    panel.remove();
    // get current label
    const label = [...tab.childNodes].find(
      (c) => c.nodeName === `#text`
    ).textContent;
    delete cmInstances[label];
  });
}

/**
 * Sync the content of a file with the server by calculating
 * the diffing patch, sending it over to the server so it can
 * apply it to the file on disk, and then verifying the change
 * made was correct by comparing the on-disk "hash" value with
 * the same value based on the current editor content.
 */
async function syncContent(filename) {
  const entry = cmInstances[filename];
  const currentContent = entry.content;
  const newContent = entry.view.state.doc.toString();
  const changes = createPatch(filename, currentContent, newContent);
  const response = await fetchSafe(`/sync/${filename}`, {
    headers: {
      "Content-Type": `text/plain`,
    },
    method: `post`,
    body: changes,
  });
  const responseHash = parseFloat(await response.text());
  if (responseHash === getFileSum(newContent)) {
    entry.content = newContent;
    updatePreview();
  } else {
    // This should, if I did everything right, never happen.
    console.error(`PRE:`, currentContent);
    console.error(`POST:`, newContent);
    console.error(`HASH:`, getFileSum(newContent), responseHash);
    console.log(`forced sync: fetching file content from server`);
    entry.content = await fetchFileContents(entry.filename);
    entry.view.dispatch({
      changes: {
        from: 0,
        to: entry.view.state.doc.length,
        insert: entry.content,
      },
    });
  }
  entry.debounce = false;
}

/**
 * update the <graphics-element> based on the current file content.
 */
function updatePreview(find, replace) {
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
  if (find && replace) {
    newFrame.src = src.replace(find, replace);
  } else {
    newFrame.src = src;
  }
}
