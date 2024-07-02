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
