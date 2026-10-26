// Light and dark mode, and (at the end) focus outlines only for keyboard users.
//
// By default the site follows the visitor's device setting. The sun/moon
// button in the header overrides it, and the choice is remembered in this
// browser. The choice is stored as data-theme="light" or "dark" on <html>;
// style.css swaps its colors based on that.
//
// This file is loaded in <head> WITHOUT "defer" or "module", so it runs before
// the page is drawn. That avoids a flash of the wrong colors on every page load.

(function () {
  const root = document.documentElement;
  root.dataset.js = ""; // scripts run: style.css shows the Share button from the start
  const KEY = "theme";
  const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");

  function saved() {
    try {
      const value = localStorage.getItem(KEY);
      return value === "light" || value === "dark" ? value : "";
    } catch {
      return ""; // storage blocked (private browsing): just follow the device
    }
  }

  // Apply the saved choice right away, before anything is drawn.
  const initial = saved();
  if (initial) root.dataset.theme = initial;

  function current() {
    return root.dataset.theme || (darkQuery.matches ? "dark" : "light");
  }

  function updateButton(button) {
    const next = current() === "dark" ? "light" : "dark";
    const label = button.querySelector(".theme-label");
    if (label) {
      // The menu's button has visible text, which screen readers read too.
      label.textContent = `${next === "dark" ? "Dark" : "Light"} mode`;
    } else {
      button.setAttribute("aria-label", `Switch to ${next} mode`);
      button.title = `Switch to ${next} mode`;
    }
    button.dataset.showing = current();
  }

  // The phone's browser bar takes the page's background color.
  function updateBarColor() {
    document.querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", current() === "dark" ? "#0c0a09" : "#fafaf9");
  }

  document.addEventListener("DOMContentLoaded", () => {
    updateBarColor();
    darkQuery.addEventListener("change", updateBarColor);
    const button = document.getElementById("theme-toggle");
    if (!button) return;
    button.hidden = false; // only shown when this script runs
    updateButton(button);
    button.addEventListener("click", () => {
      const next = current() === "dark" ? "light" : "dark";
      // Every color changes at once, without the gentle hover fades (style.css).
      root.classList.add("theme-switching");
      requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove("theme-switching")));
      root.dataset.theme = next;
      try {
        localStorage.setItem(KEY, next);
      } catch {}
      updateButton(button);
      updateBarColor();
    });
    // If the device switches (for example at sunset) and no choice was saved, follow it.
    darkQuery.addEventListener("change", () => updateButton(button));
  });
})();

// ---------- Photos fade in over their blurry preview ----------
// Photos with class="fade" start see-through (style.css, "Blurry previews") and
// fade in once loaded. This listener is set up before any photo can finish, so
// none is missed. A photo that fails to load stays hidden, and its blurry
// preview stays in place instead of a broken-image icon.
(function () {
  const mark = (img) => {
    if (img.complete && img.naturalWidth) img.classList.add("is-loaded");
  };
  document.addEventListener("load", (event) => {
    if (event.target.classList?.contains("fade")) event.target.classList.add("is-loaded");
  }, true);
  document.addEventListener("error", (event) => {
    if (event.target.classList?.contains("fade")) event.target.classList.add("is-broken");
  }, true);
  // Safety net: anything already finished by then.
  document.addEventListener("DOMContentLoaded", () => document.querySelectorAll("img.fade").forEach(mark));
  window.addEventListener("pageshow", () => document.querySelectorAll("img.fade").forEach(mark));
})();

// ---------- Focus outlines only for keyboard users ----------
// Opening the menu or the photo viewer moves the focus into it, and closing it
// moves the focus back, so keyboard users never lose their place. Safari then
// draws the blue outline even when the visitor clicked or tapped. So after a
// click or tap, data-pointer on <html> hides the outline (see style.css), and
// the next key press (Tab, arrows, Enter...) brings it back.
(function () {
  const root = document.documentElement;
  document.addEventListener("pointerdown", () => {
    root.dataset.pointer = "";
  }, true);
  document.addEventListener("keydown", (event) => {
    if (event.metaKey || event.ctrlKey) return; // shortcuts like Cmd+C are not moving around
    delete root.dataset.pointer;
  }, true);
})();
