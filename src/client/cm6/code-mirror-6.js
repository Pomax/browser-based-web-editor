// This test script uses Codemirror v6
import { basicSetup, EditorView } from "codemirror";
import { EditorState } from "@codemirror/state";

// Language-specific features:
import { css } from "@codemirror/lang-css";
import { html } from "@codemirror/lang-html";
import { javascript } from "@codemirror/lang-javascript";
import { markdown } from "@codemirror/lang-markdown";
// See https://github.com/orgs/codemirror/repositories?q=lang for more options

/**
 * Create an initial CodeMirror6 state object
 */
export function getInitialState(cmInstances, filename, data) {
  const doc = data.toString();
  const extensions = [basicSetup];

  // Can we add syntax highlighting?
  const ext = filename.substring(filename.lastIndexOf(`.`) + 1);
  const syntax = {
    css: css,
    html: html,
    js: javascript,
    md: markdown,
  }[ext];
  if (syntax) extensions.push(syntax());

  // Add debounced content change syncing
  extensions.push(
    EditorView.updateListener.of((e) => {
      const tab = e.view.tabElement;
      if (tab && e.docChanged) {
        const entry = cmInstances[tab.title];
        if (entry.debounce) {
          clearTimeout(entry.debounce);
        }
        entry.debounce = setTimeout(entry.sync, 1000);
      }
    })
  );

  return EditorState.create({ doc, extensions });
}

/**
 * Set up a CodeMirror6 view
 */
export function setupView(parent, state) {
  const view = new EditorView({ parent, state });
  return view;
}
