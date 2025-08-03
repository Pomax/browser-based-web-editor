import { updatePreview } from "../preview.js";

export class BrowserEditorTest {
  constructor() {
    this.projectName = document.querySelector(`.projectname`)?.textContent;
    this.init();
  }

  async init() {
    updatePreview();
  }
}
