(function () {
  "use strict";

  var STORAGE_LISTING = "listing_identifier";
  var STORAGE_SCAN_OK = "scan_completed";
  var STORAGE_SCAN_AT = "scan_completed_at";

  var urgencyTimerId = null;

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

  function isOtherMapsUrl(value) {
    var v = value.toLowerCase();
    return (
      v.indexOf("bing.com/maps") !== -1 ||
      v.indexOf("apple.com/maps") !== -1 ||
      v.indexOf("mapquest.com") !== -1
    );
  }

  /** Turn "triumph+heating+kelowna" or "triumph heating kelowna" into "Triumph Heating, Kelowna" when possible */
  function suggestNameCityFromQuery(query) {
    var raw = decodeURIComponent(String(query || "").replace(/\+/g, " "));
    raw = raw.trim();
    if (!raw || raw.length < 4) return "";

    var parts = raw.split(/\s+/).filter(Boolean);
    if (parts.length < 2) return "";

    var city = parts[parts.length - 1];
    var nameParts = parts.slice(0, -1);
    if (nameParts.length < 1) return "";

    function titleWord(w) {
      if (!w) return w;
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    }

    var name = nameParts.map(titleWord).join(" ");
    city = titleWord(city);
    return name + ", " + city;
  }

  function extractNameCitySuggestion(value) {
    var trimmed = String(value || "").trim();
    if (!/^https?:\/\//i.test(trimmed)) return "";

    try {
      var url = new URL(trimmed);
      var q = url.searchParams.get("q");
      if (q) {
        var fromQ = suggestNameCityFromQuery(q);
        if (fromQ && isValidNameCity(fromQ)) return fromQ;
      }
    } catch (e) {
      /* ignore */
    }
    return "";
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
    "Wrong category — every minute you show up for the wrong search, the right customer calls your competitor.",
    "Thin services list — emergency & suburb keywords missing; those searches skip you entirely.",
    "Too few photos — rivals with full galleries steal the map click while your listing looks dead.",
    "Weak description — no license, area, or urgency in line one; shoppers bounce in seconds.",
    "Blank Q&A — “Licensed?” “Same-day?” unanswered; they call the business that already answered.",
    "Stale posts — inactive profile signals “might be closed”; Google and buyers move on.",
    "Unanswered reviews — silence on 3★ stars costs more trust than the rating number.",
    "Incomplete hours/attributes — after-hours jobs and “online estimates” go to whoever has them on.",
  ];

  function pickIssues(seed, count) {
    var issues = [];
    var start = seed % ISSUE_POOL.length;
    for (var i = 0; i < count; i++) {
      issues.push(ISSUE_POOL[(start + i) % ISSUE_POOL.length]);
    }
    return issues;
  }

  function setScanStartedAt() {
    try {
      sessionStorage.setItem(STORAGE_SCAN_AT, String(Date.now()));
    } catch (e) {
      /* ignore */
    }
  }

  function getScanStartedAt() {
    try {
      var raw = sessionStorage.getItem(STORAGE_SCAN_AT);
      var n = raw ? parseInt(raw, 10) : 0;
      return isNaN(n) ? 0 : n;
    } catch (e) {
      return 0;
    }
  }

  function formatUrgencyMessage(minutes) {
    if (minutes < 1) {
      return "This minute: your listing is unchanged — local shoppers are tapping your competitor on Maps.";
    }
    if (minutes === 1) {
      return "1 minute since your scan — still unchanged. That’s another minute of calls going elsewhere.";
    }
    return (
      String(minutes) +
      " minutes since your scan — listing still unchanged. Every minute = missed local jobs."
    );
  }

  function updateUrgencyClock() {
    var el = document.getElementById("scan-urgency-clock");
    if (!el || !getScanCompleted()) return;

    var started = getScanStartedAt();
    if (!started) {
      el.textContent = formatUrgencyMessage(0);
      return;
    }

    var minutes = Math.floor((Date.now() - started) / 60000);
    el.textContent = formatUrgencyMessage(minutes);
  }

  function startUrgencyClock() {
    updateUrgencyClock();
    if (urgencyTimerId) {
      window.clearInterval(urgencyTimerId);
    }
    urgencyTimerId = window.setInterval(updateUrgencyClock, 15000);
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

  function isLikelyStrongListing(input) {
    var v = String(input || "").toLowerCase();
    return v.indexOf("triumph") !== -1 || v.indexOf("maps.google") !== -1 || v.indexOf("google.com/maps") !== -1;
  }

  function renderScanResults(input) {
    var seed = hashString(input.toLowerCase());
    var strong = isLikelyStrongListing(input);
    var before = strong ? 70 + (seed % 6) : 58 + (seed % 14);
    var after = strong ? 90 + (seed % 4) : 86 + (seed % 8);
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

    setCheckoutVisible(true);

    if (typeof window.__showStickyCheckout === "function") {
      window.__showStickyCheckout();
    }

    startUrgencyClock();
  }

  function setCheckoutVisible(show) {
    var checkoutSection = document.getElementById("checkout");
    if (checkoutSection) {
      checkoutSection.hidden = !show;
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
    var scanFix = document.getElementById("scan-fix");
    var scanUseSuggested = document.getElementById("scan-use-suggested");
    var scanSubmit = document.getElementById("scan-submit");
    var pendingSuggestion = "";
    if (!scanForm || !scanInput) return;

    function showFix(suggestion) {
      pendingSuggestion = suggestion || "";
      if (!scanFix || !scanUseSuggested) return;
      if (!pendingSuggestion) {
        scanFix.hidden = true;
        return;
      }
      scanUseSuggested.textContent = "Use instead: " + pendingSuggestion;
      scanFix.hidden = false;
    }

    function showError(message, suggestion) {
      if (scanError) {
        scanError.textContent = message;
        scanError.hidden = !message;
      }
      if (message) {
        scanInput.setAttribute("aria-invalid", "true");
        scanInput.focus();
        try {
          scanInput.scrollIntoView({ behavior: "smooth", block: "center" });
        } catch (e) {
          scanInput.scrollIntoView();
        }
      } else {
        scanInput.removeAttribute("aria-invalid");
      }
      showFix(suggestion);
    }

    function runScan(value) {
      if (scanSubmit) {
        scanSubmit.disabled = true;
        scanSubmit.textContent = "Scanning…";
      }
      showError("", "");

      window.setTimeout(function () {
        setStoredListing(value);
        setScanCompleted(true);
        setScanStartedAt();
        renderScanResults(value);
        setScanCheckbox(true);
        syncListingIdField();
        if (typeof window.__updateCheckout === "function") {
          window.__updateCheckout();
        }
        if (scanSubmit) {
          scanSubmit.disabled = false;
          scanSubmit.textContent = "Show what I’m losing →";
        }
        scrollToScanResults();
      }, 2000);
    }

    scanForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var value = String(scanInput.value || "").trim();
      if (!validateListingInput(value)) {
        var suggestion = extractNameCitySuggestion(value);
        if (isOtherMapsUrl(value)) {
          showError(
            "That’s a Bing/Apple/MapQuest link — we need a Google Maps listing link. Open Google Maps, find your business, tap Share, and paste that link here.",
            suggestion
          );
        } else if (/^https?:\/\//i.test(value)) {
          showError(
            "That doesn’t look like a Google Maps link. Use maps.google.com or google.com/maps — or type your business as Name, City (with a comma).",
            suggestion
          );
        } else {
          showError(
            "Type your business as Name, City (with a comma), e.g. Summit Plumbing, Denver — or paste a Google Maps share link.",
            ""
          );
        }
        return;
      }
      runScan(value);
    });

    if (scanUseSuggested) {
      scanUseSuggested.addEventListener("click", function () {
        if (!pendingSuggestion) return;
        scanInput.value = pendingSuggestion;
        showError("", "");
        runScan(pendingSuggestion);
      });
    }

    var fillExample = document.getElementById("scan-fill-example");
    if (fillExample) {
      fillExample.addEventListener("click", function () {
        scanInput.value = "Summit Plumbing, Denver";
        scanInput.focus();
        scanInput.select();
      });
    }

    var resultsPay = document.getElementById("scan-results-pay");
    if (resultsPay) {
      resultsPay.addEventListener("click", function () {
        var checkout = document.getElementById("checkout");
        if (checkout) {
          try {
            checkout.scrollIntoView({ behavior: "smooth", block: "start" });
          } catch (e) {
            checkout.scrollIntoView();
          }
        }
        window.setTimeout(function () {
          if (typeof window.__updateCheckout === "function") {
            window.__updateCheckout();
          }
        }, 50);
      });
    }

    var stored = getStoredListing();
    if (stored && getScanCompleted()) {
      scanInput.value = stored;
      renderScanResults(stored);
      startUrgencyClock();
      setScanCheckbox(true);
      syncListingIdField();
    }
  }

  function initPostPayRedirect() {
    try {
      var params = new URLSearchParams(window.location.search);
      if (params.has("session_id") || params.has("checkout_session_id")) {
        syncListingIdField();
        setCheckoutVisible(true);
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
        hint.textContent = "Run the free scan first — then check both boxes.";
        hint.hidden = false;
      } else if (!allChecked) {
        hint.textContent = "Check both boxes to pay.";
        hint.hidden = false;
      } else if (!stripeReady) {
        hint.hidden = true;
      } else {
        hint.hidden = true;
      }
    }
    if (stripeHint) {
      if (scanOk && allChecked && !stripeReady) {
        stripeHint.hidden = false;
      } else if (stripeReady) {
        stripeHint.hidden = true;
      } else if (!scanOk) {
        stripeHint.hidden = true;
      }
    }
  }

  setCheckoutVisible(getScanCompleted());

  bindCtaGuard(cta);
  bindCtaGuard(ctaSticky);

  window.__updateCheckout = update;

  form.addEventListener("change", update);
  update();

  var stickyObserver = null;

  function showStickyCheckout() {
    if (!stickyBar || !checkout) return;
    if (!window.matchMedia("(max-width: 767px)").matches) return;
    if (!getScanCompleted()) return;

    document.body.classList.add("has-sticky");
    stickyBar.hidden = false;

    if (stickyObserver) return;

    if ("IntersectionObserver" in window) {
      stickyObserver = new IntersectionObserver(
        function (entries) {
          var show = !entries[0].isIntersecting;
          stickyBar.classList.toggle("is-visible", show);
        },
        { root: null, rootMargin: "0px", threshold: 0 }
      );
      stickyObserver.observe(checkout);
    } else {
      stickyBar.classList.add("is-visible");
    }
  }

  window.__showStickyCheckout = showStickyCheckout;

  if (getScanCompleted()) {
    showStickyCheckout();
  }
})();
