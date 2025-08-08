import { updatePreview } from "../preview.js";

const { projectId, projectName } = document.body.dataset;

export class BrowserEditorTest {
  constructor() {
    Object.assign(this, { projectId, projectName });
    this.init();
  }

  async init() {
    updatePreview();
  }
}
