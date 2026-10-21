// The ☰ menu at the top right of every public page (the panel itself is built
// on the server, in lib/chrome.js).
//
// It uses the built-in <dialog> element, which gives for free: showing above
// everything, closing with Escape, and keeping keyboard focus inside while open.
// The slide-in and fade are in style.css ("Menu").

(function () {
  function setup() {
    const button = document.getElementById("menu-button");
    const menu = document.getElementById("site-menu");
    if (!button || !menu || !menu.showModal) return;

    function open() {
      menu.showModal();
      button.setAttribute("aria-expanded", "true");
      document.body.classList.add("no-scroll");
      // Start on the current page's link, or the first one.
      (menu.querySelector('[aria-current="page"]') || menu.querySelector(".menu-nav a"))?.focus();
    }

    function close() {
      if (menu.open) menu.close();
    }

    button.addEventListener("click", open);
    menu.addEventListener("close", () => {
      button.setAttribute("aria-expanded", "false");
      document.body.classList.remove("no-scroll");
      button.focus();
    });
    menu.querySelector("#menu-close")?.addEventListener("click", close);

    // A tap on the dark area beside the panel closes the menu.
    menu.addEventListener("click", (event) => {
      if (event.target === menu) close();
    });

    // "Contact" scrolls to the end of this page, so close the menu first.
    for (const link of menu.querySelectorAll("[data-close-menu]")) {
      link.addEventListener("click", close);
    }

    // Coming back with the browser's Back button can restore a page with the
    // menu still open; start closed instead.
    window.addEventListener("pageshow", close);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", setup);
  else setup();
})();
