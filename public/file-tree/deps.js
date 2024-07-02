export const create = (tag) => document.createElement(tag);
export const registry = globalThis.customElements;
export const HTMLElement = globalThis.HTMLElement ?? class Dummy {};
export class LocalCustomElement extends HTMLElement {}

export function dispatchEvent(from, name, detail = {}, commit = () => {}) {
  detail.commit = commit;
  from.closest(`file-tree`)?.dispatchEvent(new CustomEvent(name, { detail }));
}

export /*async*/ function getFileContent(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = ({ target }) => resolve(target.result);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

function inThisDir(dir, el) {
  if (el === dir) return true;
  if (dir.contains(el)) {
    // make sure this element is not inside *another* dir
    const parentDir = el.closest(`dir-entry`);
    return parentDir === dir;
  }
  return false;
}

/**
 * Add file and dir drop-zone functionality to the file tree
 */
export function addDropZone(dir) {
  const abort = new AbortController();

  // fie drag and drop
  dir.addEventListener(
    `dragover`,
    function dropHandler(evt) {
      const el = evt.target;

      if (inThisDir(dir, el)) {
        evt.preventDefault();
        dir.classList.add(`drop`);
      }
    },
    { signal: abort.signal }
  );

  dir.addEventListener(
    `dragenter`,
    function dropHandler(evt) {
      evt.preventDefault();
      dir.classList.add(`drop`);
    },
    { signal: abort.signal }
  );

  dir.addEventListener(
    `dragleave`,
    function dropHandler(evt) {
      evt.preventDefault();
      dir.classList.remove(`drop`);
    },
    { signal: abort.signal }
  );

  dir.addEventListener(
    `drop`,
    async function dropHandler(evt) {
      evt.preventDefault();
      evt.stopPropagation();
      dir.classList.remove(`drop`);

      // file-entry drop?
      const entryId = evt.dataTransfer.getData(`id`);
      if (entryId) {
        const entry = document.querySelector(`[data-id="${entryId}"]`);
        delete entry.dataset.id;
        entry.classList.remove(`dragging`);

        const oldPath = entry.getAttribute(`path`);
        const dirPath = dir.getAttribute(`path`);

        if (entry instanceof FileEntry) {
          const newPath =
            (dirPath !== `.` ? dirPath : ``) +
            oldPath.substring(oldPath.lastIndexOf(`/`) + 1);

          if (oldPath !== newPath) {
            dispatchEvent(
              dir,
              `filetree:file:move`,
              { oldPath, newPath },
              () => {
                entry.setAttribute(`path`, newPath);
                dir.appendChild(entry);
                dir.sort();
              }
            );
          }
        }

        if (entry instanceof DirEntry) {
          const newPath =
            (dirPath !== `.` ? dirPath : ``) + entry.heading.textContent + `/`;
          if (oldPath !== newPath) {
            dispatchEvent(
              dir,
              `filetree:dir:move`,
              { oldPath, newPath },
              () => {
                entry.querySelectorAll(`[path]`).forEach((e) => {
                  e.setAttribute(
                    `path`,
                    e.getAttribute(`path`).replace(oldPath, newPath)
                  );
                });
                entry.setAttribute(
                  `path`,
                  entry.getAttribute(`path`).replace(oldPath, newPath)
                );
                dir.appendChild(entry);
                dir.sort();
              }
            );
          }
        }
        return;
      }

      async function traverseFileTree(item, path = ``) {
        if (item.isFile) {
          item.file(async (file) => {
            const content = await getFileContent(file);
            const fileName = path + file.name;
            dir.processFileUpload(fileName, content);
          });
        } else if (item.isDirectory) {
          item.createReader().readEntries(function (entries) {
            entries.forEach(async (entry) => {
              await traverseFileTree(entry, path + item.name + "/");
            });
          });
        }
      }

      await Promise.all(
        [...evt.dataTransfer.items].map(async (item, index) =>
          traverseFileTree(item.webkitGetAsEntry())
        )
      );
    },
    { signal: abort.signal }
  );

  return () => abort.abort();
}
