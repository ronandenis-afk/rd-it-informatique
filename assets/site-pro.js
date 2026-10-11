// RD IT Informatique — en-tête fixe et bouton d'appel mobile
(() => {
  const bar = document.querySelector(".topbar");
  if (bar) {
    const onScroll = () => bar.classList.toggle("is-scrolled", window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }
  if (!document.querySelector(".call-fab")) {
    const a = document.createElement("a");
    a.className = "call-fab";
    a.href = "tel:+33695954056";
    a.setAttribute("aria-label", "Appeler RD IT Informatique au 06 95 95 40 56");
    a.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/></svg><span>Appeler</span>';
    document.body.appendChild(a);
  }
})();
