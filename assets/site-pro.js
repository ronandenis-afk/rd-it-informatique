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
  // Le bouton « Appeler » flottant se cache quand un autre bouton d'appel est déjà visible à l'écran
  const fab = document.querySelector(".call-fab");
  if (fab && "IntersectionObserver" in window) {
    const visibles = new Set();
    const autres = [...document.querySelectorAll('a[href^="tel:"]')].filter((l) => l !== fab && !l.closest("p, footer, .footer-inner, .topbar"));
    const io = new IntersectionObserver((entrees) => {
      entrees.forEach((en) => { en.isIntersecting ? visibles.add(en.target) : visibles.delete(en.target); });
      fab.classList.toggle("is-hidden", visibles.size > 0);
    });
    autres.forEach((l) => io.observe(l));
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

// Thème futuriste : réseau de particules dans les héros, halo qui suit la souris, apparition au défilement
(() => {
  const calme = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const souris = window.matchMedia("(hover: hover)").matches;

  // Halo lumineux qui suit la souris sur les cartes
  if (souris) {
    document.querySelectorAll(".card, .review-card, .flip-front, .related a, .zone-inner, .checklist li").forEach((c) => {
      c.classList.add("fx-spot");
      c.addEventListener("pointermove", (e) => {
        const r = c.getBoundingClientRect();
        c.style.setProperty("--mx", (e.clientX - r.left) + "px");
        c.style.setProperty("--my", (e.clientY - r.top) + "px");
      });
    });
  }

  if (calme) return;

  // Apparition douce des blocs au défilement
  if ("IntersectionObserver" in window) {
    const cibles = document.querySelectorAll("main section:not(.hero):not(.page-hero) .wrap > *, .service-grid > *, .cards > *, .reviews-grid > *, .steps-grid > *, .related > *");
    const io = new IntersectionObserver((entrees) => {
      entrees.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("fx-in"); io.unobserve(en.target); } });
    }, { rootMargin: "0px 0px -8% 0px", threshold: .08 });
    cibles.forEach((el) => {
      if (el.getBoundingClientRect().top < innerHeight) return; // déjà visible : on n'y touche pas
      const frere = el.parentElement ? [...el.parentElement.children].indexOf(el) : 0;
      el.style.transitionDelay = Math.min(frere, 5) * 70 + "ms";
      el.classList.add("fx-reveal");
      io.observe(el);
    });
  }

  // Réseau de particules connectées dans le bandeau du haut
  const hero = document.querySelector(".hero, .page-hero");
  if (!hero) return;
  const cv = document.createElement("canvas");
  cv.className = "fx-canvas"; cv.setAttribute("aria-hidden", "true");
  hero.prepend(cv);
  const ctx = cv.getContext("2d");
  let W = 0, H = 0, pts = [], visible = true;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const taille = () => {
    W = hero.clientWidth; H = hero.clientHeight;
    cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.round(Math.min(80, (W * H) / 16000));
    pts = Array.from({ length: n }, () => ({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - .5) * .35, vy: (Math.random() - .5) * .35, r: Math.random() * 1.6 + .6 }));
  };
  taille();
  let attente; window.addEventListener("resize", () => { clearTimeout(attente); attente = setTimeout(taille, 200); });
  const m = { x: -999, y: -999 };
  hero.addEventListener("pointermove", (e) => { const r = hero.getBoundingClientRect(); m.x = e.clientX - r.left; m.y = e.clientY - r.top; });
  hero.addEventListener("pointerleave", () => { m.x = m.y = -999; });
  let tourne = false;
  const lance = () => { if (!tourne && visible && !document.hidden) { tourne = true; requestAnimationFrame(dessine); } };
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; lance(); }).observe(hero);
  const D = 130;
  function dessine() {
    if (!visible || document.hidden) { tourne = false; return; }
    ctx.clearRect(0, 0, W, H);
    for (const p of pts) {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > W) p.vx *= -1;
      if (p.y < 0 || p.y > H) p.vy *= -1;
      const dx = p.x - m.x, dy = p.y - m.y, dm = Math.hypot(dx, dy);
      if (dm < 140) { p.x += dx / dm * .8; p.y += dy / dm * .8; }
    }
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      for (let j = i + 1; j < pts.length; j++) {
        const b = pts[j], d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < D) { ctx.strokeStyle = "rgba(0,229,255," + ((1 - d / D) * .28).toFixed(3) + ")"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
      }
      ctx.fillStyle = i % 5 ? "rgba(0,229,255,.8)" : "rgba(61,139,255,.9)";
      ctx.beginPath(); ctx.arc(a.x, a.y, a.r, 0, 6.283); ctx.fill();
    }
    requestAnimationFrame(dessine);
  }
  document.addEventListener("visibilitychange", lance);
})();
