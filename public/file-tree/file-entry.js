import { create, registry, LocalCustomElement, dispatchEvent } from "./deps.js";

/**
 * ...
 */
export class FileEntry extends LocalCustomElement {
  setName(fileName, fullPath) {
    console.log(`fileEntry.setName`, fileName, fullPath);
    this.setAttribute(`name`, fileName);
    this.setAttribute(`path`, fullPath);

    const heading = (this.heading = create(`file-heading`));
    heading.textContent = fileName;
    this.appendChild(heading);

    const rename = create(`button`);
    rename.title = `rename file`;
    rename.textContent = `✏️`;
    this.appendChild(rename);
    rename.addEventListener(`click`, (evt) => {
      evt.preventDefault();
      evt.stopPropagation();
      const newFileName = prompt(
        `New file name?`,
        this.heading.textContent
      )?.trim();
      if (newFileName) {
        const oldName = this.getAttribute(`path`);
        const newName = oldName.replace(this.heading.textContent, newFileName);
        const currentPath = this.getAttribute(`path`);
        dispatchEvent(
          this,
          `filetree:file:rename`,
          { oldName, newName },
          () => {
            this.setAttribute(
              `path`,
              currentPath.replace(this.heading.textContent, newFileName)
            );
            this.setAttribute(`name`, newFileName);
            this.heading.textContent = newFileName;
          }
        );
      }
    });

    const remove = create(`button`);
    remove.title = `delete file`;
    remove.textContent = `🗑️`;
    this.appendChild(remove);
    remove.addEventListener(`click`, (evt) => {
      evt.preventDefault();
      evt.stopPropagation();
      if (confirm(`are you sure you want to delete this file?`)) {
        const filetree = this.closest(`file-tree`);
        const dirEntry = this.closest(`dir-entry`);
        dispatchEvent(
          this,
          `filetree:file:delete`,
          { path: this.getAttribute(`path`) },
          () => {
            dirEntry.removeChild(this);
            if (filetree?.getAttribute(`remove-empty`)) {
              dirEntry.checkEmpty();
            }
          }
        );
      }
    });

    this.addEventListener(`click`, () => {
      dispatchEvent(
        this,
        `filetree:file:click`,
        { fullPath: this.getAttribute(`path`) },
        () => {
          const filetree = this.closest(`file-tree`);
          filetree
            .querySelectorAll(`.selected`)
            .forEach((e) => e.classList.remove(`selected`));
          this.classList.add(`selected`);
        }
      );
    });

    // allow this file to be moved from one dir to another
    this.draggable = true;
    this.addEventListener(`dragstart`, (evt) => {
      evt.stopPropagation();
      this.classList.add(`dragging`);
      this.dataset.id = `${Date.now()}-${Math.random()}`;
      evt.dataTransfer.setData("id", this.dataset.id);
    });
  }

  select(filePath) {
    const localPath = this.getAttribute(`path`);
    this.classList.toggle(`selected`, filePath === localPath);
  }

  remove(filePath) {
    const localPath = this.getAttribute(`path`);
    if (localPath === filePath) {
      this.parentNode.removeChild(this);
    }
  }
}

class FileHeading extends LocalCustomElement {
  // this is "just an HTML element" for housing some text
}

registry.define(`file-entry`, FileEntry);
registry.define(`file-heading`, FileHeading);
