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

  initIntakeDeepLink();

  var form = document.getElementById("prequal-form");
  if (!form) return;

  var boxes = form.querySelectorAll('input[type="checkbox"][name="prequal"]');
  var cta = document.getElementById("pay-cta");
  var ctaSticky = document.getElementById("pay-cta-sticky");
  var hint = document.getElementById("prequal-hint");
  var stickyBar = document.getElementById("sticky-bar");
  var checkout = document.getElementById("checkout");

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
    setCtaState(cta, allChecked);
    setCtaState(ctaSticky, allChecked);
    if (hint) {
      hint.hidden = allChecked;
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
