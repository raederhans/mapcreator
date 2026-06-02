## Context

User reported that clicking Project Management download did not produce an actual download, and requested the browser-download-directory option move to a file picker flow so users can choose name and location.

Findings:
- `projectDownloadDestination` defaulted to the synthetic browser download path in `js/ui/sidebar.js`.
- `FileManager.writeBlobDownload()` opened `showSaveFilePicker` only for explicit `destination: "picker"`; otherwise it created a hidden `<a download>` link.
- The hidden download branch is fragile in embedded or restricted browser surfaces.
- Existing tests covered picker cancellation and selected destination pass-through, but not save picker file-type options or the desired default.

Changes:
- Project Management now exposes the save dialog destination as the user-facing export path.
- `FileManager.exportProject()` passes format-aware picker type filters for JSON and ZIP.
- Success status copy now refers to the selected project file so ZIP exports do not report JSON-specific text.

Live process owner:
- Main agent owned all test/build/browser smoke runs for this task.
