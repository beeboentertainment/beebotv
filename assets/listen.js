/* Website narration was removed at Nick's request on November 14, 2026.
 * Keep this shared endpoint inert for existing pages and bookmarks.
 * Website maintenance must not fetch speech manifests or generate audio.
 */
(function () {
  "use strict";
  document.querySelectorAll(".bb-listen").forEach(function (widget) {
    widget.remove();
  });
})();
