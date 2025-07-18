import { setupFileTree } from "../cm6/file-tree-utils.js";
import { addEventHandling } from "../cm6/event-handling.js";
import { BrowserEditorTest } from "./browser-editor-test.js";

/**
 * A setup based on CodeMirror 6
 */
export class CodeMirror6Test extends BrowserEditorTest {
  constructor() {
    super();
  }

  async init() {
    // CodeMirror 6 has no built in file browser, so we need to add one.
    await setupFileTree(this);
    // as such we also need custom handling for editor panes and tabs
    const { contentDir } = this;
    addEventHandling(contentDir);
    super.init();
  }
}
