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
  // Cartes de services qui se retournent
  const touch = !window.matchMedia("(hover: hover)").matches;
  const rot = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/></svg>';
  document.querySelectorAll(".service-grid .service-card").forEach((card) => {
    const icon = card.querySelector(".service-icon"), title = card.querySelector("h3");
    if (!icon || !title || card.classList.contains("flip")) return;
    const text = card.querySelector("p"), more = card.querySelector(".card-more");
    const inner = document.createElement("div"); inner.className = "flip-inner";
    const front = document.createElement("div"); front.className = "flip-face flip-front";
    const back = document.createElement("div"); back.className = "flip-face flip-back";
    front.append(icon, title.cloneNode(true));
    front.insertAdjacentHTML("beforeend", '<span class="flip-hint">' + rot + (touch ? "Touchez pour en savoir plus" : "Survolez pour en savoir plus") + "</span>");
    back.append(title);
    if (text) back.append(text);
    if (more) back.append(more);
    card.replaceChildren(inner); inner.append(front, back);
    card.classList.add("flip");
    card.tabIndex = 0;
    card.setAttribute("aria-label", title.textContent.trim() + " : afficher le détail");
    const toggle = () => card.classList.toggle("is-flipped");
    card.addEventListener("click", (e) => { if (!e.target.closest("a") && touch) toggle(); });
    card.addEventListener("keydown", (e) => { if ((e.key === "Enter" || e.key === " ") && e.target === card) { e.preventDefault(); toggle(); } });
  });
})();
