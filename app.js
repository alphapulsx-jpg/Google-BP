(function () {
  "use strict";

  var y = document.getElementById("y");
  if (y) {
    y.textContent = String(new Date().getFullYear());
  }

  var form = document.getElementById("prequal-form");
  if (!form) return;

  var boxes = form.querySelectorAll('input[type="checkbox"][name="prequal"]');
  var cta = document.getElementById("pay-cta");
  var hint = document.getElementById("prequal-hint");

  function update() {
    var allChecked = true;
    for (var i = 0; i < boxes.length; i++) {
      if (!boxes[i].checked) {
        allChecked = false;
        break;
      }
    }
    if (cta) {
      if (allChecked) {
        cta.classList.remove("is-disabled");
        cta.setAttribute("aria-disabled", "false");
        cta.removeAttribute("tabindex");
      } else {
        cta.classList.add("is-disabled");
        cta.setAttribute("aria-disabled", "true");
        cta.setAttribute("tabindex", "-1");
      }
    }
    if (hint) {
      hint.hidden = allChecked;
    }
  }

  if (cta) {
    cta.addEventListener("click", function (e) {
      if (cta.classList.contains("is-disabled")) {
        e.preventDefault();
      }
    });
    cta.addEventListener("keydown", function (e) {
      if (cta.classList.contains("is-disabled") && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
      }
    });
  }

  form.addEventListener("change", update);
  update();
})();
