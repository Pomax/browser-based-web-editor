import { FileEntry } from "./file-entry.js";
import { create, registry, LocalCustomElement, dispatchEvent } from "./deps.js";

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
function addDropZone(dir) {
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

function addFileToDir(dirEntry, dir) {
  let fileName = prompt(
    "Please specify a filename.\nUse / as directory delimiter (e.g. cake/yum.js)"
  )?.trim();
  if (fileName) {
    let prompted = fileName;
    if (dir !== `.`) {
      fileName = dir + fileName;
    }
    if (fileName.includes(`.`)) {
      dispatchEvent(dirEntry, `filetree:file:create`, { fileName }, () => {
        return dirEntry.addFile(prompted, fileName);
      });
    } else {
      if (confirm(`Did you mean to create a new directory ${fileName}?`)) {
        dispatchEvent(
          dirEntry,
          `filetree:dir:create`,
          { dirName: fileName },
          () => {
            dirEntry.addDirectory(prompted + `/`, fileName + `/`);
          }
        );
      }
    }
  }
}

/**
 * ...
 */
export class DirEntry extends LocalCustomElement {
  connectedCallback() {
    this.removeListener = addDropZone(this);
  }

  disconnectedCallback() {
    this.removeListener();
  }

  setName(name, fullPath = name) {
    this.setAttribute(`name`, name);
    this.setAttribute(`path`, fullPath);
    const heading = (this.heading = create(`dir-heading`));
    heading.textContent = name.replace(`/`, ``);
    this.appendChild(heading);

    const add = create(`button`);
    add.title = `add new file`;
    add.textContent = `+`;
    add.addEventListener(`click`, () => addFileToDir(this, fullPath));
    this.appendChild(add);

    if (this.getAttribute(`path`) !== `.`) {
      const rename = create(`button`);
      rename.title = `rename dir`;
      rename.textContent = `✏️`;
      this.appendChild(rename);
      rename.addEventListener(`click`, (evt) => {
        const newName = prompt(
          `Choose a new directory name`,
          this.heading.textContent
        )?.trim();
        if (newName) {
          const oldName = this.heading.textContent;
          const oldPath = this.getAttribute(`path`);
          const newPath = oldPath.replace(oldName, newName);
          dispatchEvent(
            this,
            `filetree:dir:rename`,
            { oldPath, newPath },
            () => {
              this.heading.textContent = newName;
              this.setAttribute(`name`, newName);
              this.setAttribute(`path`, newPath);
            }
          );
        }
      });

      const remove = create(`button`);
      remove.title = `delete dir`;
      remove.textContent = `🗑️`;
      this.appendChild(remove);
      remove.addEventListener(`click`, (evt) => {
        const msg = `Are you *sure* you want to delete this directory and everything in it?`;
        if (confirm(msg)) {
          dispatchEvent(
            this,
            `filetree:dir:delete`,
            { path: this.getAttribute(`path`) },
            () => {
              this.parentNode.removeChild(this);
            }
          );
        }
      });
    }

    this.draggable = true;
    this.addEventListener(`dragstart`, (evt) => {
      evt.stopPropagation();
      this.classList.add(`dragging`);
      this.dataset.id = `${Date.now()}-${Math.random()}`;
      evt.dataTransfer.setData("id", this.dataset.id);
    });
  }

  setFiles(files = []) {
    files.forEach((fileName) => {
      this.addFile(fileName, fileName);
    });
    this.sort();
  }

  processFileUpload(fileName, content) {
    const localPath = this.getAttribute(`path`);
    const fullPath = (localPath !== `.` ? localPath : ``) + fileName;
    dispatchEvent(
      this,
      `filetree:file:upload`,
      { fileName: fullPath, content },
      () => {
        this.addFile(fileName, fullPath);
        this.sort(true);
      }
    );
  }

  addFile(fileName, fullPath = fileName) {
    if (!fileName.includes(`/`)) {
      if (fileName.includes(`.`)) {
        return this.addFileDirectly(fileName, fullPath);
      } else {
        // this is a dir, make sure to add the trailing `/`
        return this.addDirectory(fileName + `/`, fullPath + `/`);
      }
    }
    const dirName = fileName.substring(0, fileName.indexOf(`/`) + 1);
    const dirPath = fullPath.substring(0, fullPath.lastIndexOf(`/`) + 1);
    let dir = this.querySelector(`dir-entry[name="${dirName}"]`);
    if (!dir) {
      dir = new DirEntry();
      dir.setName(dirName, dirPath);
      this.appendChild(dir);
    }
    return dir.addFile(fileName.replace(dirName, ``), fullPath);
  }

  addFileDirectly(fileName, fullPath) {
    const file = new FileEntry();
    file.setName(fileName, fullPath);
    this.appendChild(file);
    this.sort(false);
    return file;
  }

  addDirectory(dirName, fullPath) {
    const dir = new DirEntry();
    dir.setName(dirName, fullPath);
    this.appendChild(dir);
    this.sort(false);
    return dir;
  }

  sort(recursive = true) {
    const children = [...this.children];
    children.sort((a, b) => {
      if (!a.tagName.startsWith(`FILE-`)) return -1;
      if (!b.tagName.startsWith(`FILE-`)) return 1;
      a = a.getAttribute(`path`);
      b = b.getAttribute(`path`);
      return a < b ? -1 : 1;
    });
    children.forEach((c) => {
      this.appendChild(c);
    });
    if (recursive) {
      this.querySelectorAll(`dir-entry`).forEach((d) => d.sort());
    }
  }

  select(filePath) {
    Array.from(this.children).forEach((c) => c?.select?.(filePath));
  }

  remove(filePath) {
    Array.from(this.children).forEach((c) => {
      c instanceof LocalCustomElement &&
        !c.tagName.includes(`HEADING`) &&
        c.remove?.(filePath);
    });
  }

  checkEmpty() {
    if (!this.querySelector(`file-entry`)) {
      dispatchEvent(
        this,
        `filetree:dir:delete`,
        { path: this.getAttribute(`path`) },
        () => {
          this.parentNode.removeChild(this);
        }
      );
    }
  }
}

class DirHeading extends LocalCustomElement {
  // this is "just an HTML element" for housing some text
}

registry.define(`dir-entry`, DirEntry);
registry.define(`dir-heading`, DirHeading);
