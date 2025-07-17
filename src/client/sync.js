import { fetchFileContents, fetchSafe, getFileSum } from "./utils.js";
import { createPatch } from "../../public/vendor/diff.js";
import { updatePreview } from "../client/preview.js";

/**
 * Sync the content of a file with the server by calculating
 * the diffing patch, sending it over to the server so it can
 * apply it to the file on disk, and then verifying the change
 * made was correct by comparing the on-disk "hash" value with
 * the same value based on the current editor content.
 */
export async function syncContent(
  entry,
  contentDir,
  filename = entry.filename
) {
  if (entry.noSync) return;

  const currentContent = entry.content;
  const newContent = entry.view.state.doc.toString();
  const changes = createPatch(filename, currentContent, newContent);
  const response = await fetchSafe(`/sync/${filename}`, {
    headers: { "Content-Type": `text/plain` },
    method: `post`,
    body: changes,
  });

  const responseHash = parseFloat(await response.text());

  if (responseHash === getFileSum(newContent)) {
    entry.content = newContent;
    updatePreview();
  }

  // This should, if I did everything right, never happen.
  else {
    console.error(`PRE:`, currentContent);
    console.error(`POST:`, newContent);
    console.error(`HASH:`, getFileSum(newContent), responseHash);
    console.log(`forced sync: fetching file content from server`);
    entry.content = await fetchFileContents(contentDir, entry.filename);
    entry.view.dispatch({
      changes: {
        from: 0,
        to: entry.view.state.doc.length,
        insert: entry.content,
      },
    });
  }
  entry.debounce = false;
}
