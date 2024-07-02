import { DirEntry } from "./dir-entry.js";
import { registry, LocalCustomElement } from "./deps.js";

/**
 * ...
 */
export class FileTree extends LocalCustomElement {
  setFiles(files = []) {
    let root = this.querySelector(`dir-tree`);
    if (!root) {
      root = this.root = new DirEntry();
      this.appendChild(root);
    }
    root.setName(`.`);
    root.setFiles(files);
  }

  /**
   * TODO: can we refactor this out of existence?
   */
  select(filePath) {
    Array.from(this.children).forEach((c) => c?.select?.(filePath));
  }

  /**
   * TODO: can we refactor this out of existence?
   */
  addFile(filePath) {
    return this.root.addFile(filePath);
  }

  /**
   * TODO: can we refactor this out of existence?
   */
  remove(filePath) {
    Array.from(this.children).forEach(
      (c) => c instanceof LocalCustomElement && c.remove(filePath)
    );
  }
}

registry.define(`file-tree`, FileTree);
