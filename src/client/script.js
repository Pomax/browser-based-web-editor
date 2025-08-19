import "../../public/vendor/file-tree.esm.min.js";
import { setupFileTree } from "./cm6/file-tree-utils.js";
import { addEventHandling } from "./cm6/event-handling.js";
import { updatePreview } from "./preview.js";

const { projectId, projectName } = document.body.dataset;

class CodeMirror6 {
  constructor() {
    Object.assign(this, { projectId, projectName });
    this.init();
  }

  async init() {
    // CodeMirror 6 has no built in file browser, so we need to add one.
    await setupFileTree(this);
    // As such, we also need custom handling for editor panes and tabs
    addEventHandling(this.projectName);
    updatePreview();
  }
}

new CodeMirror6();
