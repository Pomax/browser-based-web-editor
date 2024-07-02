export const create = (tag) => document.createElement(tag);
export const registry = globalThis.customElements;
export const HTMLElement = globalThis.HTMLElement ?? class Dummy {};
export class LocalCustomElement extends HTMLElement {}

export function dispatchEvent(from, name, detail = {}, commit = () => {}) {
  detail.commit = commit;
  from.closest(`file-tree`)?.dispatchEvent(new CustomEvent(name, { detail }));
}
