/* Beebo "Testers wanted" page helper.
   No network, no storage, no third-party code. It does two small things:
   1. builds the text of a mailto: link from the boxes the visitor ticks and the details they type;
      the link only opens the visitor's own email app, nothing is sent by this page;
   2. opens the <details> area that a link like become-a-tester.html#samsung-lg points to. */
(function () {
  "use strict";
  var TO = "testers@beeboentertainment.com";
  var MAX = 1800; // some mail apps cut very long mailto: links

  function byId(id) { return document.getElementById(id); }
  function val(id) { var e = byId(id); return e ? e.value.replace(/^\s+|\s+$/g, "") : ""; }

  var form = byId("signup-form");
  var link = byId("signup-link");
  var preview = byId("signup-preview");
  var warn = byId("signup-warn");

  function build() {
    if (!form || !link) return;
    var boxes = form.querySelectorAll("input[name=area]:checked");
    var areas = [];
    for (var i = 0; i < boxes.length; i++) areas.push("- " + boxes[i].value);
    var have = form.querySelector("input[name=haveserver]:checked");
    var lines = [
      "Tester application",
      "",
      "Areas I want to test:",
      areas.length ? areas.join("\n") : "(none ticked yet - please list them)",
      "",
      "Name (optional): " + val("f-name"),
      "Email: " + val("f-email"),
      "Devices and OS versions: " + val("f-devices"),
      "Time zone: " + val("f-tz"),
      "I have a Beebo PC/server: " + (have ? have.value : ""),
      "Gmail address for the Google Play test (Android Play test only): " + val("f-gmail")
    ];
    var body = lines.join("\n");
    var href = "mailto:" + TO + "?subject=" + encodeURIComponent("Tester application") +
      "&body=" + encodeURIComponent(body.replace(/\n/g, "\r\n"));
    link.setAttribute("href", href);
    if (preview) preview.textContent = body;
    if (warn) warn.hidden = href.length <= MAX;
  }

  if (form) {
    form.addEventListener("input", build);
    form.addEventListener("change", build);
    form.addEventListener("submit", function (e) { e.preventDefault(); });
    build();
  }

  function openTarget() {
    var id = decodeURIComponent((location.hash || "").replace(/^#/, ""));
    if (!id) return;
    var el = byId(id);
    if (!el) return;
    var d = el.tagName === "DETAILS" ? el : (el.closest ? el.closest("details") : null);
    if (d && !d.open) {
      d.open = true;
      if (el.scrollIntoView) el.scrollIntoView();
    }
  }
  openTarget();
  window.addEventListener("hashchange", openTarget);

  var toggle = byId("toggle-all");
  if (toggle) {
    toggle.hidden = false;
    toggle.addEventListener("click", function () {
      var all = document.querySelectorAll("details.area");
      var anyClosed = false, i;
      for (i = 0; i < all.length; i++) if (!all[i].open) anyClosed = true;
      for (i = 0; i < all.length; i++) all[i].open = anyClosed;
      toggle.textContent = anyClosed ? "Close all areas" : "Open all areas";
    });
  }
})();
