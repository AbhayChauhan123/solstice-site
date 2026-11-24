/* Solstice Group LLC site script. See README.md. */
const CONTACT_EMAIL = "info@solsticegroupusa.com";

/* FormSubmit delivers contact form submissions to CONTACT_EMAIL. */
const FORM_ENDPOINT = "https://formsubmit.co/ajax/" + CONTACT_EMAIL;

(function () {
  "use strict";

  const doc = document.documentElement;
  doc.classList.add("js");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* Footer year stays current. */
  function fillYear() {
    document.querySelectorAll("[data-year]").forEach(function (el) {
      el.textContent = String(new Date().getFullYear());
    });
  }

  /* Count a number from one value to another, easing out. */
  function countTo(el, from, to, duration, delay) {
    const start = performance.now() + delay;
    function frame(now) {
      const t = Math.min(Math.max((now - start) / duration, 0), 1);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = Math.round(from + (to - from) * eased).toLocaleString("en-US");
      if (t < 1) window.requestAnimationFrame(frame);
    }
    window.requestAnimationFrame(frame);
  }

  /* Hero dashboard: the stats count up as their cards appear (timed to the CSS
     delays), then one order ships. Skipped entirely with reduced motion. */
  function initHeroDemo() {
    const dash = document.querySelector(".console");
    if (!dash || reduceMotion.matches) return;

    const kpis = dash.querySelectorAll(".kpi");
    kpis.forEach(function (kpi, i) {
      const value = kpi.querySelector(".kpi-value");
      const target = parseInt(value.textContent.replace(/,/g, ""), 10);
      if (!target) return;
      value.textContent = "0";
      countTo(value, 0, target, 900, 320 + i * 70);
    });

    window.setTimeout(function () {
      const pill = dash.querySelector(".console-table tbody tr:nth-child(2) .pill");
      const ready = kpis[1];
      if (!pill || !ready) return;
      pill.classList.add("is-swapping");
      window.setTimeout(function () {
        pill.textContent = "Shipped";
        pill.classList.add("pill--blue");
        pill.classList.remove("is-swapping");
        countTo(ready.querySelector(".kpi-value"), 5, 4, 360, 0);
        ready.querySelector(".kpi-note").textContent = "1 due today";
      }, 180);
    }, 3200);
  }

  /* Sections fade up once when they first enter the viewport. */
  function initReveal() {
    const items = document.querySelectorAll(".reveal");
    if (!items.length) return;
    if (reduceMotion.matches || !("IntersectionObserver" in window)) {
      items.forEach(function (el) { el.classList.add("is-visible"); });
      return;
    }
    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -10% 0px", threshold: 0.05 });
    items.forEach(function (el) { observer.observe(el); });
  }

  /* "Learn more" links preselect the matching inquiry type in the contact form. */
  function initInquiryLinks() {
    const select = document.getElementById("inquiry");
    if (!select) return;
    document.querySelectorAll("[data-inquiry]").forEach(function (link) {
      link.addEventListener("click", function () {
        select.value = link.getAttribute("data-inquiry");
      });
    });
  }

  /* Mobile menu: button toggles, Escape closes and returns focus. */
  function initNav() {
    const toggle = document.querySelector(".nav-toggle");
    const nav = document.getElementById("site-nav");
    if (!toggle || !nav) return;

    function setOpen(open, returnFocus) {
      toggle.setAttribute("aria-expanded", String(open));
      nav.classList.toggle("is-open", open);
      if (open) {
        const first = nav.querySelector("a");
        if (first) first.focus();
      } else if (returnFocus) {
        toggle.focus();
      }
    }

    toggle.addEventListener("click", function () {
      setOpen(toggle.getAttribute("aria-expanded") !== "true", false);
    });

    nav.addEventListener("click", function (event) {
      if (event.target.closest("a")) setOpen(false, false);
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
        setOpen(false, true);
      }
    });

    document.addEventListener("click", function (event) {
      if (toggle.getAttribute("aria-expanded") === "true" && !event.target.closest(".site-header")) {
        setOpen(false, false);
      }
    });

    window.matchMedia("(min-width: 48rem)").addEventListener("change", function (mq) {
      if (mq.matches) setOpen(false, false);
    });
  }

  /* In-page links: scroll, then move focus to the target for keyboard and screen reader users. */
  function initAnchors() {
    document.addEventListener("click", function (event) {
      const link = event.target.closest('a[href^="#"]');
      if (!link) return;
      const id = link.getAttribute("href").slice(1);
      const target = id === "top" ? document.body : document.getElementById(id);
      if (!target) return;
      event.preventDefault();

      const behavior = reduceMotion.matches ? "auto" : "smooth";
      if (id === "top") {
        window.scrollTo({ top: 0, behavior: behavior });
      } else {
        target.scrollIntoView({ behavior: behavior, block: "start" });
      }

      const focusTarget = id === "top" ? document.getElementById("main") : target;
      if (focusTarget) {
        if (!focusTarget.hasAttribute("tabindex")) focusTarget.setAttribute("tabindex", "-1");
        focusTarget.focus({ preventScroll: true });
      }
      if (history.replaceState) history.replaceState(null, "", "#" + id);
    });
  }

  /* Contact form: inline validation, FormSubmit delivery, email fallback on failure. */
  function initForm() {
    const form = document.getElementById("contact-form");
    if (!form) return;
    const status = document.getElementById("form-status");
    const submit = form.querySelector('button[type="submit"]');
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    const rules = {
      name: function (v) { return v ? "" : "Enter your name."; },
      company: function (v) { return v ? "" : "Enter your company or organization."; },
      email: function (v) {
        if (!v) return "Enter your email address.";
        return emailPattern.test(v) ? "" : "Enter an email address in the format name@example.com.";
      },
      phone: function (v) {
        if (!v) return "";
        return /^[\d\s()+.\-]{7,}$/.test(v) ? "" : "Enter a phone number using digits, spaces, or dashes.";
      },
      inquiry: function (v) { return v ? "" : "Select an inquiry type."; },
      message: function (v) {
        if (!v) return "Enter a message.";
        return v.length >= 10 ? "" : "Add a little more detail so we can respond.";
      }
    };

    function validateField(id) {
      const field = document.getElementById(id);
      const error = document.getElementById(id + "-error");
      const message = rules[id](field.value.trim());
      error.textContent = message;
      if (message) {
        field.setAttribute("aria-invalid", "true");
      } else {
        field.removeAttribute("aria-invalid");
      }
      return !message;
    }

    Object.keys(rules).forEach(function (id) {
      const field = document.getElementById(id);
      field.addEventListener("blur", function () {
        if (field.value.trim() || field.hasAttribute("aria-invalid")) validateField(id);
      });
      field.addEventListener("input", function () {
        if (field.hasAttribute("aria-invalid")) validateField(id);
      });
    });

    function setStatus(html, isError) {
      status.innerHTML = html;
      status.classList.toggle("is-error", Boolean(isError));
    }

    function mailtoHref(data) {
      const subject = "Website inquiry: " + data.get("inquiry_type");
      const body = [
        "Name: " + data.get("name"),
        "Company: " + data.get("company"),
        "Email: " + data.get("email"),
        "Phone: " + (data.get("phone") || "Not provided"),
        "Inquiry type: " + data.get("inquiry_type"),
        "",
        data.get("message")
      ].join("\n");
      return "mailto:" + CONTACT_EMAIL + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      setStatus("", false);

      const invalid = Object.keys(rules).filter(function (id) { return !validateField(id); });
      if (invalid.length) {
        document.getElementById(invalid[0]).focus();
        setStatus("Please correct the " + (invalid.length === 1 ? "field" : invalid.length + " fields") + " marked above.", true);
        return;
      }

      const data = new FormData(form);
      if (data.get("_honey")) return;

      const payload = {};
      data.forEach(function (value, key) { payload[key] = value; });
      payload._subject = "Website inquiry: " + data.get("inquiry_type");
      payload._replyto = data.get("email");

      submit.setAttribute("aria-busy", "true");
      submit.disabled = true;

      fetch(FORM_ENDPOINT, {
        method: "POST",
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json", Accept: "application/json" }
      })
        .then(function (response) {
          if (!response.ok) throw new Error("Request failed");
          return response.json();
        })
        .then(function (result) {
          if (String(result.success) !== "true") throw new Error("Not delivered");
          form.reset();
          setStatus("Thank you. Your inquiry was sent to " + CONTACT_EMAIL + ". We will reply by email.", false);
        })
        .catch(function () {
          const link = document.createElement("a");
          link.href = mailtoHref(data);
          link.textContent = "send it by email instead";
          setStatus("Your message could not be sent. Please try again, or ", true);
          status.appendChild(link);
          status.appendChild(document.createTextNode("."));
        })
        .finally(function () {
          submit.removeAttribute("aria-busy");
          submit.disabled = false;
          status.setAttribute("tabindex", "-1");
          status.focus();
        });
    });
  }

  fillYear();
  initHeroDemo();
  initReveal();
  initInquiryLinks();
  initNav();
  initAnchors();
  initForm();
})();
