import { fetchSafe } from "../utils.js";
import { getMimeType } from "../content-types.js";
import { updatePreview } from "../preview.js";
import { getOrCreateFileEditTab } from "./editor-components.js";

import { unzip } from "../../../public/vendor/unzipit.module.js";

const fileTree = document.getElementById(`filetree`);

/**
 * Make sure we're in sync with the server...
 */
export async function setupFileTree(test) {
  const dirData = await fetchSafe(`/dir`).then((r) => r.json());
  if (dirData instanceof Error) return;
  fileTree.setFiles(dirData);
  addFileTreeHandling(test);
}

/**
 * Deal with all the events that might be coming from the file tree
 */
function addFileTreeHandling(test) {
  const { cmInstances, contentDir } = test;

  // TODO: lots of duplication happening here

  fileTree.addEventListener(`file:click`, async (evt) => {
    const { path } = evt.detail;
    getOrCreateFileEditTab(cmInstances, contentDir, path);
    // we handle selection in the file tree as part of editor reveals,
    // so we do not call the event's own grant() function.
  });

  fileTree.addEventListener(`dir:click`, async (evt) => {
    evt.detail.grant();
  });

  fileTree.addEventListener(`file:create`, async (evt) => {
    const { fileName, grant } = evt.detail;
    const response = await fetchSafe(`/new/${fileName}`, { method: `post` });
    if (response instanceof Error) return;
    if (response.status === 200) {
      const entry = grant();
      getOrCreateFileEditTab(
        cmInstances,
        contentDir,
        entry.getAttribute(`path`)
      );
    } else {
      console.error(`Could not create ${fileName} (status:${response.status})`);
    }
  });

  fileTree.addEventListener(`file:rename`, async (evt) => {
    const { oldName, newName, grant } = evt.detail;
    const response = await fetchSafe(`/rename/${oldName}:${newName}`, {
      method: `post`,
    });
    if (response instanceof Error) return;
    if (response.status === 200) {
      grant();
      let key = oldName.replace(contentDir, ``);
      const entry = cmInstances[key];
      if (entry) {
        // FIXME: DEDUPE, THIS CODE OCCURS FOUR TIMES NOW
        delete cmInstances[key];
        key = newName.replace(contentDir, ``);
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

  async function uploadFile(fileName, content, grant) {
    const fileSize = content.byteLength;
    if (fileSize > 1_000_000) {
      return alert(`File uploads are limited to 1MB`);
    }
    const form = new FormData();
    form.append(`filename`, fileName);
    form.append(
      `content`,
      typeof content === "string"
        ? content
        : new Blob([content], { type: getMimeType(fileName) })
    );
    const response = await fetchSafe(`/upload/${fileName}`, {
      method: `post`,
      body: form,
    });
    if (response instanceof Error) return;
    if (response.status === 200) {
      grant?.();
    } else {
      console.error(`Could not upload ${fileName} (status:${response.status})`);
    }
  }

  fileTree.addEventListener(`file:upload`, async (evt) => {
    const { fileName, content, grant } = evt.detail;
    if (fileName.endsWith(`.zip`) && confirm(`Unpack zip file?`)) {
      const basePath = fileName.substring(0, fileName.lastIndexOf(`/`) + 1);
      const { entries } = await unzip(new Uint8Array(content).buffer);
      for await (let [fileName, entry] of Object.entries(entries)) {
        const arrayBuffer = await entry.arrayBuffer();
        const content = new TextDecoder().decode(arrayBuffer);
        if (content.trim()) {
          fileName = basePath + fileName;
          uploadFile(fileName, content, () => fileTree.addEntry(fileName));
        }
      }
    } else {
      uploadFile(fileName, content, grant);
    }
    updatePreview();
  });

  fileTree.addEventListener(`file:move`, async (evt) => {
    const { oldPath, newPath, grant } = evt.detail;
    const response = await fetchSafe(`/rename/${oldPath}:${newPath}`, {
      method: `post`,
    });
    if (response instanceof Error) return;
    if (response.status === 200) {
      grant();
      let key = oldPath.replace(contentDir, ``);
      const entry = cmInstances[key];
      if (entry) {
        // FIXME: DEDUPE, THIS CODE OCCURS FOUR TIMES NOW
        delete cmInstances[key];
        key = newPath.replace(contentDir, ``);
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

  fileTree.addEventListener(`file:delete`, async (evt) => {
    const { path: fileName, grant } = evt.detail;
    if (fileName) {
      try {
        const response = await fetchSafe(`/delete/${fileName}`, {
          method: `delete`,
        });
        if (response instanceof Error) return;
        if (response.status === 200) {
          grant();
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

  fileTree.addEventListener(`dir:create`, async (evt) => {
    const { dirName, grant } = evt.detail;
    const response = await fetchSafe(`/new/${dirName}`, { method: `post` });
    if (response instanceof Error) return;
    if (response.status === 200) {
      grant();
    } else {
      console.error(`Could not create ${dirName} (status:${response.status})`);
    }
  });

  fileTree.addEventListener(`dir:rename`, async (evt) => {
    const { oldPath, newPath, grant } = evt.detail;
    const response = await fetchSafe(`/rename/${oldPath}:${newPath}`, {
      method: `post`,
    });
    if (response instanceof Error) return;
    if (response.status === 200) {
      const { oldPath, newPath } = grant();
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

  fileTree.addEventListener(`dir:move`, async (evt) => {
    const { oldPath, newPath, grant } = evt.detail;
    const response = await fetchSafe(`/rename/${oldPath}:${newPath}`, {
      method: `post`,
    });
    if (response instanceof Error) return;
    if (response.status === 200) {
      grant();
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

  fileTree.addEventListener(`dir:delete`, async (evt) => {
    const { path, grant } = evt.detail;
    const response = await fetchSafe(`/delete-dir/${path}`, {
      method: `delete`,
    });
    if (response instanceof Error) return;
    if (response.status === 200) {
      grant();
    } else {
      console.error(`Could not delete ${path} (status:${response.status})`);
    }
    updatePreview();
  });
}
