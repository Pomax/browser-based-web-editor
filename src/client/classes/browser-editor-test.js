import { updatePreview } from "../preview.js";

export class BrowserEditorTest {
  constructor() {
    this.project = document.querySelector(`.projectname`)?.textContent;
    this.contentDir = `content/${this.project ?? `anonymous`}`;
    this.init();
  }

  async init() {
    updatePreview();
  }
}
