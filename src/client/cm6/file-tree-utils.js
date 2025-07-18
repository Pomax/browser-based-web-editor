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
  fileTree.setContent(dirData);
  addFileTreeHandling(test);
}

/**
 * Deal with all the events that might be coming from the file tree
 */
function addFileTreeHandling(test) {
  const { contentDir } = test;

  function updateEditorBindings(fileTreeEntry, entry, key, oldKey) {
    if (oldKey) {
      fileTreeEntry.state = {};
    }

    fileTreeEntry.setState(entry);

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

  fileTree.addEventListener(`file:click`, async (evt) => {
    const fileEntry = evt.detail.grant();
    getOrCreateFileEditTab(
      fileEntry,
      contentDir,
      fileEntry.getAttribute(`path`)
    );
    // we handle selection in the file tree as part of editor reveals,
    // so we do not call the event's own grant() function.
  });

  fileTree.addEventListener(`dir:click`, async (evt) => {
    evt.detail.grant();
  });

  fileTree.addEventListener(`dir:toggle`, async (evt) => {
    evt.detail.grant();
  });

  fileTree.addEventListener(`file:create`, async (evt) => {
    const { path, grant, content } = evt.detail;

    // file upload/drop
    if (content) {
      if (path.endsWith(`.zip`) && confirm(`Unpack zip file?`)) {
        const basePath = path.substring(0, path.lastIndexOf(`/`) + 1);
        const { entries } = await unzip(new Uint8Array(content).buffer);
        for await (let [path, entry] of Object.entries(entries)) {
          const arrayBuffer = await entry.arrayBuffer();
          const content = new TextDecoder().decode(arrayBuffer);
          if (content.trim()) {
            path = basePath + path;
            uploadFile(path, content, () => fileTree.addEntry(path));
          }
        }
      } else {
        uploadFile(path, content, grant);
      }
      updatePreview();
    }

    // regular file creation
    else {
      const response = await fetchSafe(`/new/${path}`, { method: `post` });
      if (response instanceof Error) return;
      if (response.status === 200) {
        const fileEntry = grant();
        getOrCreateFileEditTab(
          fileEntry,
          contentDir,
          fileEntry.getAttribute(`path`)
        );
      } else {
        console.error(
          `Could not create ${fileName} (status:${response.status})`
        );
      }
    }
  });

  fileTree.addEventListener(`file:rename`, async (evt) => {
    const { oldPath, newPath, grant } = evt.detail;
    const response = await fetchSafe(`/rename/${oldPath}:${newPath}`, {
      method: `post`,
    });
    if (response instanceof Error) return;
    if (response.status === 200) {
      const fileEntry = grant();
      let key = oldPath.replace(contentDir, ``);
      const entry = fileEntry.state;
      if (entry) {
        const newKey = newPath.replace(contentDir, ``);
        updateEditorBindings(fileEntry, entry, newKey, key);
      }
    } else {
      console.error(
        `Could not rename ${oldPath} to ${newPath} (status:${response.status})`
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

  fileTree.addEventListener(`file:move`, async (evt) => {
    const { oldPath, newPath, grant } = evt.detail;
    const response = await fetchSafe(`/rename/${oldPath}:${newPath}`, {
      method: `post`,
    });
    if (response instanceof Error) return;
    if (response.status === 200) {
      const fileEntry = grant();
      let key = oldPath.replace(contentDir, ``);
      const entry = fileEntry.state;
      if (entry) {
        const newKey = newPath.replace(contentDir, ``);
        updateEditorBindings(fileEntry, entry, newKey, key);
      }
    } else {
      console.error(
        `Could not move ${oldPath} to ${newPath} (status:${response.status})`
      );
    }
    updatePreview();
  });

  fileTree.addEventListener(`file:delete`, async (evt) => {
    const { path, grant } = evt.detail;
    if (path) {
      try {
        const response = await fetchSafe(`/delete/${path}`, {
          method: `delete`,
        });
        if (response instanceof Error) return;
        if (response.status === 200) {
          const [fileEntry] = grant();
          fileEntry.state?.close?.click();
        } else {
          console.error(`Could not delete ${path} (status:${response.status})`);
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
      grant();
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
