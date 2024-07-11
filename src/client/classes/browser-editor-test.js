import { updatePreview } from "../preview.js";

export class BrowserEditorTest {
  constructor() {
    this.user = document.querySelector(`.username`)?.textContent;
    this.contentDir = `content/${this.user ?? `anonymous`}`;
    this.init();
  }

  async init() {
    updatePreview();
  }
}
