(function () {
  "use strict";

  var STORAGE_LISTING = "listing_identifier";
  var STORAGE_SCAN_OK = "scan_completed";

  var y = document.getElementById("y");
  if (y) {
    y.textContent = String(new Date().getFullYear());
  }

  function hashString(str) {
    var h = 0;
    for (var i = 0; i < str.length; i++) {
      h = (h << 5) - h + str.charCodeAt(i);
      h |= 0;
    }
    return Math.abs(h);
  }

  function isValidMapsUrl(value) {
    var v = value.toLowerCase();
    return (
      v.indexOf("maps.google.com") !== -1 ||
      v.indexOf("google.com/maps") !== -1 ||
      v.indexOf("goo.gl/maps") !== -1 ||
      v.indexOf("maps.app.goo.gl") !== -1
    );
  }

  function isValidNameCity(value) {
    if (value.indexOf(",") === -1) return false;
    var parts = value.split(",");
    if (parts.length < 2) return false;
    var name = parts[0].trim();
    var city = parts.slice(1).join(",").trim();
    return name.length >= 2 && city.length >= 2 && value.trim().length >= 8;
  }

  function validateListingInput(value) {
    var trimmed = String(value || "").trim();
    if (!trimmed) return false;
    if (/^https?:\/\//i.test(trimmed)) {
      return isValidMapsUrl(trimmed);
    }
    return isValidNameCity(trimmed);
  }

  var ISSUE_POOL = [
    "Wrong primary category — you show up for the wrong searches (e.g. “general contractor” instead of your trade).",
    "Thin services list — missing emergency, financing, or suburb keywords customers actually search.",
    "Too few photos — competitors with 15+ job-site shots win the map pack click.",
    "Short or generic description — no license, years in business, or service area in the first line.",
    "No Q&A answered — “Are you licensed?” and “Same-day?” left blank while rivals answer first.",
    "Stale Google posts — last update months ago; profile looks inactive to Google and shoppers.",
    "Review replies missing — unanswered 3★ reviews hurt trust more than the rating itself.",
    "Hours or attributes incomplete — after-hours and “online estimates” toggles not set.",
  ];

  function pickIssues(seed, count) {
    var issues = [];
    var start = seed % ISSUE_POOL.length;
    for (var i = 0; i < count; i++) {
      issues.push(ISSUE_POOL[(start + i) % ISSUE_POOL.length]);
    }
    return issues;
  }

  function getScanCompleted() {
    try {
      return sessionStorage.getItem(STORAGE_SCAN_OK) === "1";
    } catch (e) {
      return false;
    }
  }

  function setScanCompleted(value) {
    try {
      sessionStorage.setItem(STORAGE_SCAN_OK, value ? "1" : "0");
    } catch (e) {
      /* ignore */
    }
  }

  function getStoredListing() {
    try {
      return String(sessionStorage.getItem(STORAGE_LISTING) || "").trim();
    } catch (e) {
      return "";
    }
  }

  function setStoredListing(value) {
    try {
      sessionStorage.setItem(STORAGE_LISTING, value);
    } catch (e) {
      /* ignore */
    }
  }

  function syncListingIdField() {
    var listingField = document.getElementById("listing-id");
    var stored = getStoredListing();
    if (listingField && stored) {
      listingField.value = stored;
    }
    var summary = document.getElementById("checkout-listing-summary");
    var summaryValue = document.getElementById("checkout-listing-value");
    if (summary && summaryValue && stored) {
      summaryValue.textContent = stored.length > 60 ? stored.slice(0, 57) + "…" : stored;
      summary.hidden = false;
    }
  }

  function renderScanResults(input) {
    var seed = hashString(input.toLowerCase());
    var before = 52 + (seed % 17);
    var after = 85 + (seed % 10);
    var beforeEl = document.getElementById("scan-score-before");
    var afterEl = document.getElementById("scan-score-after");
    var issuesList = document.getElementById("scan-issues-list");
    var resultsSection = document.getElementById("scan-results");

    if (beforeEl) beforeEl.textContent = String(before);
    if (afterEl) afterEl.textContent = String(after);

    if (issuesList) {
      issuesList.innerHTML = "";
      var issues = pickIssues(seed, 3);
      for (var i = 0; i < issues.length; i++) {
        var li = document.createElement("li");
        li.textContent = issues[i];
        issuesList.appendChild(li);
      }
    }

    if (resultsSection) {
      resultsSection.hidden = false;
    }
  }

  function scrollToScanResults() {
    var resultsSection = document.getElementById("scan-results");
    if (!resultsSection) return;
    var reduceMotion =
      window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    resultsSection.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  }

  function setScanCheckbox(checked) {
    var scanBox = document.getElementById("prequal-scan");
    if (scanBox) {
      scanBox.checked = checked;
    }
  }

  function initScanForm() {
    var scanForm = document.getElementById("scan-form");
    var scanInput = document.getElementById("scan-input");
    var scanError = document.getElementById("scan-error");
    var scanSubmit = document.getElementById("scan-submit");
    if (!scanForm || !scanInput) return;

    function showError(show) {
      if (scanError) scanError.hidden = !show;
      if (show) scanInput.setAttribute("aria-invalid", "true");
      else scanInput.removeAttribute("aria-invalid");
    }

    function runScan(value) {
      if (scanSubmit) {
        scanSubmit.disabled = true;
        scanSubmit.textContent = "Scanning…";
      }
      showError(false);

      window.setTimeout(function () {
        setStoredListing(value);
        setScanCompleted(true);
        renderScanResults(value);
        setScanCheckbox(true);
        syncListingIdField();
        if (typeof window.__updateCheckout === "function") {
          window.__updateCheckout();
        }
        if (scanSubmit) {
          scanSubmit.disabled = false;
          scanSubmit.textContent = "Scan free";
        }
        scrollToScanResults();
      }, 2000);
    }

    scanForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var value = String(scanInput.value || "").trim();
      if (!validateListingInput(value)) {
        showError(true);
        scanInput.focus();
        return;
      }
      runScan(value);
    });

    var stored = getStoredListing();
    if (stored && getScanCompleted()) {
      scanInput.value = stored;
      renderScanResults(stored);
      setScanCheckbox(true);
      syncListingIdField();
    }
  }

  function initPostPayRedirect() {
    try {
      var params = new URLSearchParams(window.location.search);
      if (params.has("session_id") || params.has("checkout_session_id")) {
        syncListingIdField();
        var checkout = document.getElementById("checkout");
        if (checkout) {
          var reduceMotion =
            window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
          window.requestAnimationFrame(function () {
            checkout.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
          });
        }
      }
    } catch (e) {
      /* ignore */
    }
  }

  initScanForm();
  initPostPayRedirect();
  syncListingIdField();

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
        if (!getScanCompleted()) {
          var scanForm = document.getElementById("scan-form");
          if (scanForm) {
            scanForm.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }
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
    var scanOk = getScanCompleted();
    var stripeUrl = getStripePaymentUrl();
    var stripeReady = isStripePaymentConfigured(stripeUrl);
    var canPay = allChecked && scanOk && stripeReady;
    applyCheckoutHref(stripeUrl);
    setCtaState(cta, canPay);
    setCtaState(ctaSticky, canPay);
    if (hint) {
      if (!scanOk) {
        hint.textContent = "Complete the free scan above, then check all boxes to enable payment.";
        hint.hidden = false;
      } else if (!allChecked) {
        hint.textContent = "Check all boxes to enable payment.";
        hint.hidden = false;
      } else if (!stripeReady) {
        hint.textContent = "Check all boxes to enable payment.";
        hint.hidden = false;
      } else {
        hint.hidden = true;
      }
    }
    if (stripeHint) {
      stripeHint.hidden = !allChecked || !scanOk || stripeReady;
    }
  }

  window.__updateCheckout = update;

  bindCtaGuard(cta);
  bindCtaGuard(ctaSticky);

  form.addEventListener("change", update);
  update();

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
