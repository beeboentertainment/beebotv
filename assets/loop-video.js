/* Short silent looping clips: <video class="loop" data-src="x.mp4" poster="x.jpg" muted loop playsinline>
   - loads the file only when it scrolls near the screen
   - pauses when off screen
   - does nothing (poster image stays) when the visitor prefers reduced motion */
(function () {
  "use strict";
  var vids = [].slice.call(document.querySelectorAll("video.loop[data-src]"));
  if (!vids.length) return;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)");
  function still(v) {
    // show the poster as a plain image instead
    var img = document.createElement("img");
    img.src = v.getAttribute("poster");
    img.alt = v.getAttribute("aria-label") || "";
    img.loading = "lazy";
    v.parentNode.insertBefore(img, v);
    v.remove();
  }
  if (reduce && reduce.matches) { vids.forEach(still); return; }
  function load(v) {
    if (!v.getAttribute("src")) {
      v.setAttribute("src", v.getAttribute("data-src"));
      v.muted = true;
    }
  }
  if (!("IntersectionObserver" in window)) {
    vids.forEach(function (v) { load(v); v.play().catch(function () {}); });
    return;
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      var v = e.target;
      if (e.isIntersecting) { load(v); v.play().catch(function () {}); }
      else if (!v.paused) v.pause();
    });
  }, { rootMargin: "200px 0px" });
  vids.forEach(function (v) { io.observe(v); });
})();
