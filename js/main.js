/* =========================================================================
   ClairEspace — interactions
   Vanilla JS, no dependencies. Progressive enhancement, a11y-friendly.
   ========================================================================= */
(function () {
  "use strict";
  var d = document;
  var on = function (el, ev, fn, o) { el && el.addEventListener(ev, fn, o || false); };

  /* ---------- Sticky header shadow ---------- */
  var header = d.querySelector(".site-header");
  if (header) {
    var onScroll = function () { header.classList.toggle("is-scrolled", window.scrollY > 8); };
    on(window, "scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ---------- Mobile nav ---------- */
  var toggle = d.querySelector(".nav__toggle");
  on(toggle, "click", function () {
    var open = d.body.classList.toggle("nav-open");
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
  });
  // close nav on link click
  d.querySelectorAll(".nav__links a").forEach(function (a) {
    on(a, "click", function () { d.body.classList.remove("nav-open"); toggle && toggle.setAttribute("aria-expanded", "false"); });
  });

  /* ---------- Before / After sliders ---------- */
  d.querySelectorAll("[data-ba]").forEach(function (ba) {
    var before = ba.querySelector(".ba__before");
    var handle = ba.querySelector(".ba__handle");
    var range = ba.querySelector(".ba__range");
    var set = function (val) {
      val = Math.max(0, Math.min(100, val));
      if (before) before.style.clipPath = "inset(0 " + (100 - val) + "% 0 0)";
      if (handle) handle.style.left = val + "%";
      if (range) range.value = val;
    };
    if (range) {
      on(range, "input", function () { set(parseFloat(range.value)); });
      set(parseFloat(range.value || 50));
    }
    // pointer drag anywhere on the image
    var dragging = false;
    var move = function (clientX) {
      var r = ba.getBoundingClientRect();
      set(((clientX - r.left) / r.width) * 100);
    };
    on(ba, "pointerdown", function (e) {
      if (e.target === range) return; // range handles itself
      dragging = true; move(e.clientX);
      range && range.focus();
    });
    on(window, "pointermove", function (e) { if (dragging) move(e.clientX); }, { passive: true });
    on(window, "pointerup", function () { dragging = false; });
  });

  /* ---------- FAQ accordion ---------- */
  d.querySelectorAll(".faq__q").forEach(function (q) {
    on(q, "click", function () {
      var item = q.closest(".faq__item");
      var ans = item.querySelector(".faq__a");
      var open = item.classList.toggle("is-open");
      q.setAttribute("aria-expanded", open ? "true" : "false");
      ans.style.maxHeight = open ? ans.scrollHeight + "px" : "0px";
    });
  });

  /* ---------- Scroll reveal ---------- */
  var reveals = d.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && reveals.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    reveals.forEach(function (r) { io.observe(r); });
  } else {
    reveals.forEach(function (r) { r.classList.add("is-in"); });
  }

  /* ---------- Animated counters ---------- */
  var counters = d.querySelectorAll("[data-count]");
  if ("IntersectionObserver" in window && counters.length) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target, target = parseFloat(el.getAttribute("data-count"));
        var suffix = el.getAttribute("data-suffix") || "", dur = 1200, t0 = null;
        var step = function (ts) {
          if (!t0) t0 = ts;
          var p = Math.min((ts - t0) / dur, 1);
          var eased = 1 - Math.pow(1 - p, 3);
          var val = target * eased;
          el.textContent = (target % 1 === 0 ? Math.round(val) : val.toFixed(1)) + suffix;
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
        cio.unobserve(el);
      });
    }, { threshold: 0.5 });
    counters.forEach(function (c) { cio.observe(c); });
  }

  /* ---------- Devis form (validation + envoi) ---------- */
  var form = d.querySelector("#devis-form");
  if (form) {
    var showErr = function (field, bad) { field.classList.toggle("field--error", bad); };
    var showSuccess = function () {
      form.style.display = "none";
      var success = d.querySelector("#devis-success");
      if (success) { success.classList.add("is-visible"); success.scrollIntoView({ behavior: "smooth", block: "center" }); }
    };
    on(form, "submit", function (e) {
      e.preventDefault();
      var ok = true;
      form.querySelectorAll("[required]").forEach(function (input) {
        var field = input.closest(".field");
        var valid = input.value.trim() !== "" && (input.type !== "email" || /.+@.+\..+/.test(input.value)) && (input.type !== "tel" || input.value.replace(/\D/g, "").length >= 8);
        showErr(field, !valid);
        if (!valid && ok) { ok = false; input.focus(); }
      });
      if (!ok) return;

      var action = form.getAttribute("action");
      // Pas d'endpoint configuré (démo locale) → succès simulé
      if (!action || action === "#") { showSuccess(); return; }

      // Endpoint réel (contact.php / Formspree…) → envoi AJAX, sans rechargement
      var btn = form.querySelector('button[type="submit"]');
      var btnHtml = btn ? btn.innerHTML : "";
      if (btn) { btn.disabled = true; btn.textContent = "Envoi en cours…"; }
      fetch(action, {
        method: (form.getAttribute("method") || "POST").toUpperCase(),
        body: new FormData(form),
        headers: { "X-Requested-With": "fetch", "Accept": "application/json" }
      }).then(function (r) {
        if (r.ok) { showSuccess(); }
        else { form.submit(); } // repli : soumission classique (redirige vers merci.html)
      }).catch(function () {
        form.submit(); // repli réseau
      }).then(function () {
        if (btn) { btn.disabled = false; btn.innerHTML = btnHtml; }
      });
    });
    // efface l'erreur à la saisie
    form.querySelectorAll("input, select, textarea").forEach(function (input) {
      on(input, "input", function () { input.closest(".field").classList.remove("field--error"); });
    });
  }

  /* ---------- Footer year ---------- */
  var yr = d.querySelector("[data-year]");
  if (yr) yr.textContent = new Date().getFullYear();
})();
