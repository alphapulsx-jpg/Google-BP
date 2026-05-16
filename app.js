(function () {
  "use strict";

  var y = document.getElementById("y");
  if (y) {
    y.textContent = String(new Date().getFullYear());
  }

  function initIntakeDeepLink() {
    var intake = document.getElementById("intake");
    if (!intake) return;

    function paramsHaveStripeSession() {
      try {
        var params = new URLSearchParams(window.location.search);
        return params.has("session_id") || params.has("checkout_session_id");
      } catch (e) {
        return false;
      }
    }

    function shouldScrollToIntake() {
      var hash = (window.location.hash || "").replace(/^#/, "");
      return hash === "intake" || paramsHaveStripeSession();
    }

    function pulseIntake() {
      intake.classList.add("intake--pulse");
      window.setTimeout(function () {
        intake.classList.remove("intake--pulse");
      }, 2100);
    }

    function scrollToIntake() {
      var reduceMotion =
        window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      intake.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
      pulseIntake();
    }

    function maybeScrollFromUrl() {
      if (!shouldScrollToIntake()) return;
      window.requestAnimationFrame(function () {
        window.requestAnimationFrame(scrollToIntake);
      });
    }

    maybeScrollFromUrl();
    window.addEventListener("hashchange", maybeScrollFromUrl);
  }

  /**
   * Minimal on-page capture: one field opens a prefilled 1-question Google Form.
   * Owner: replace YOUR_FORM_ID and YOUR_ENTRY_ID (listing_identifier).
   * Optional: YOUR_SESSION_ENTRY_ID for hidden session_id (Stripe redirect ?session_id=).
   */
  function initListingIntakeSubmit() {
    var intakeForm = document.getElementById("listing-intake-form");
    var listingInput = document.getElementById("listing-id");
    if (!intakeForm || !listingInput) return;

    // https://docs.google.com/forms/d/e/YOUR_FORM_ID/viewform?entry.YOUR_ENTRY_ID=
    var GOOGLE_FORM_BASE = "https://docs.google.com/forms/d/e/YOUR_FORM_ID/viewform";
    var ENTRY_LISTING = "YOUR_ENTRY_ID";
    var ENTRY_SESSION = "YOUR_SESSION_ENTRY_ID";

    function getSessionIdFromUrl() {
      try {
        var params = new URLSearchParams(window.location.search);
        return (
          params.get("session_id") ||
          params.get("checkout_session_id") ||
          ""
        ).trim();
      } catch (e) {
        return "";
      }
    }

    function buildPrefilledFormUrl(listingValue) {
      var url =
        GOOGLE_FORM_BASE +
        "?entry." +
        ENTRY_LISTING +
        "=" +
        encodeURIComponent(listingValue);
      var sessionId = getSessionIdFromUrl();
      if (sessionId && ENTRY_SESSION && ENTRY_SESSION !== "YOUR_SESSION_ENTRY_ID") {
        url += "&entry." + ENTRY_SESSION + "=" + encodeURIComponent(sessionId);
      }
      return url;
    }

    intakeForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var value = String(listingInput.value || "").trim();
      if (!value) {
        listingInput.focus();
        return;
      }
      var target = buildPrefilledFormUrl(value);
      window.open(target, "_blank", "noopener,noreferrer");
    });
  }

  initIntakeDeepLink();
  initListingIntakeSubmit();

  var form = document.getElementById("prequal-form");
  if (!form) return;

  var boxes = form.querySelectorAll('input[type="checkbox"][name="prequal"]');
  var cta = document.getElementById("pay-cta");
  var ctaSticky = document.getElementById("pay-cta-sticky");
  var hint = document.getElementById("prequal-hint");
  var stripeHint = document.getElementById("prequal-stripe-hint");
  var stickyBar = document.getElementById("sticky-bar");
  var checkout = document.getElementById("checkout");

  function getStripePaymentUrl() {
    if (!cta) return "";
    return String(cta.getAttribute("data-stripe-url") || "").trim();
  }

  function isStripePaymentConfigured(url) {
    return /^https:\/\/buy\.stripe\.com\//i.test(url);
  }

  function applyCheckoutHref(url) {
    var safe = isStripePaymentConfigured(url) ? url : "#checkout";
    if (cta) {
      cta.setAttribute("href", safe);
      if (isStripePaymentConfigured(url)) {
        cta.setAttribute("target", "_blank");
        cta.setAttribute("rel", "noopener noreferrer");
      } else {
        cta.removeAttribute("target");
        cta.removeAttribute("rel");
      }
    }
    if (ctaSticky) {
      ctaSticky.setAttribute("href", safe);
      if (isStripePaymentConfigured(url)) {
        ctaSticky.setAttribute("target", "_blank");
        ctaSticky.setAttribute("rel", "noopener noreferrer");
      } else {
        ctaSticky.removeAttribute("target");
        ctaSticky.removeAttribute("rel");
      }
    }
  }

  function setCtaState(el, enabled) {
    if (!el) return;
    if (enabled) {
      el.classList.remove("is-disabled");
      el.setAttribute("aria-disabled", "false");
      el.removeAttribute("tabindex");
    } else {
      el.classList.add("is-disabled");
      el.setAttribute("aria-disabled", "true");
      el.setAttribute("tabindex", "-1");
    }
  }

  function bindCtaGuard(el) {
    if (!el) return;
    el.addEventListener("click", function (e) {
      if (el.classList.contains("is-disabled")) {
        e.preventDefault();
      }
    });
    el.addEventListener("keydown", function (e) {
      if (el.classList.contains("is-disabled") && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
      }
    });
  }

  function update() {
    var allChecked = true;
    for (var i = 0; i < boxes.length; i++) {
      if (!boxes[i].checked) {
        allChecked = false;
        break;
      }
    }
    var stripeUrl = getStripePaymentUrl();
    var stripeReady = isStripePaymentConfigured(stripeUrl);
    var canPay = allChecked && stripeReady;
    applyCheckoutHref(stripeUrl);
    setCtaState(cta, canPay);
    setCtaState(ctaSticky, canPay);
    if (hint) {
      hint.hidden = allChecked;
    }
    if (stripeHint) {
      stripeHint.hidden = !allChecked || stripeReady;
    }
  }

  bindCtaGuard(cta);
  bindCtaGuard(ctaSticky);

  form.addEventListener("change", update);
  update();

  var printBtn = document.getElementById("print-brochure-btn");
  if (printBtn) {
    printBtn.addEventListener("click", function () {
      window.print();
    });
  }

  if (stickyBar && checkout && window.matchMedia("(max-width: 767px)").matches) {
    document.body.classList.add("has-sticky");
    stickyBar.hidden = false;

    if ("IntersectionObserver" in window) {
      var observer = new IntersectionObserver(
        function (entries) {
          var show = !entries[0].isIntersecting;
          stickyBar.classList.toggle("is-visible", show);
        },
        { root: null, rootMargin: "0px", threshold: 0 }
      );
      observer.observe(checkout);
    } else {
      stickyBar.classList.add("is-visible");
    }
  }
})();
