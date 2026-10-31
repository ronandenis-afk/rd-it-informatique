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

// Thème Halloween — s'active seul jusqu'au mardi 3 novembre 2026 inclus (s'éteint le 4 à minuit)
(() => {
  const fin = new Date("2026-11-04T00:00:00+01:00");
  if (Date.now() >= fin.getTime() || /[?&]nohalloween/.test(location.search)) return;
  const mobile = window.matchMedia("(max-width:700px)").matches;
  const css = `
:root{--lime:#ff8a1f;--mint:#a855f7}
.hw-layer{position:fixed;inset:0;pointer-events:none;z-index:40;overflow:hidden;perspective:900px}
.hw-bat{position:absolute;left:-80px;width:34px;opacity:.38;color:#ff8a1f;filter:drop-shadow(0 0 6px rgba(168,85,247,.7));animation:hw-fly linear infinite}
.hw-bat svg{width:100%;height:auto;animation:hw-flap 1.1s ease-in-out infinite alternate;transform-origin:center}
@keyframes hw-fly{0%{transform:translate(0,0)}25%{transform:translate(28vw,-18px)}50%{transform:translate(55vw,12px)}75%{transform:translate(82vw,-10px)}100%{transform:translate(calc(100vw + 160px),0)}}
@keyframes hw-flap{from{transform:scaleY(1)}to{transform:scaleY(.82)}}
/* Citrouilles 3D */
.hw-pump{position:absolute;width:var(--s,90px);height:var(--s,90px);transform-style:preserve-3d;opacity:.9;animation:hw-float 7s ease-in-out infinite alternate}
.hw-pump-in{position:absolute;inset:0;transform-style:preserve-3d;animation:hw-spin 12s ease-in-out infinite alternate}
.hw-pump i{position:absolute;inset:14% 8%;border-radius:50%;background:radial-gradient(circle at 40% 35%,#ffb04d,#ff7a00 55%,#b84a00);box-shadow:inset -4px -6px 10px rgba(80,20,0,.45);backface-visibility:visible}
.hw-pump b{position:absolute;left:46%;top:2%;width:8%;height:20%;background:linear-gradient(#5b8a2b,#2f5214);border-radius:40% 40% 20% 20%;transform:rotate(8deg) translateZ(1px)}
.hw-pump .hw-face{position:absolute;inset:0;transform:translateZ(calc(var(--s,90px) * .29));display:flex;align-items:center;justify-content:center}
.hw-pump .hw-face svg{width:56%;filter:drop-shadow(0 0 6px #ffdd55)}
@keyframes hw-spin{from{transform:rotateY(-15deg) rotateX(-6deg)}to{transform:rotateY(15deg) rotateX(-6deg)}}
@keyframes hw-float{from{transform:translateY(0)}to{transform:translateY(-6px)}}
/* Araignées qui défilent */
.hw-crawl{position:absolute;left:0;top:0;will-change:offset-distance;width:28px;height:28px;opacity:.75;offset-rotate:auto 90deg;animation:hw-path linear infinite}
.hw-crawl svg{width:100%;height:100%;filter:drop-shadow(0 0 3px rgba(255,255,255,.35))}
.hw-crawl .lg{transform-box:fill-box}
.hw-crawl .lg.r{transform-origin:left center}.hw-crawl .lg.l{transform-origin:right center}
.hw-crawl .lg:nth-of-type(2n){animation-direction:alternate-reverse}
@keyframes hw-legs{from{transform:rotate(-7deg)}to{transform:rotate(7deg)}}
@keyframes hw-path{from{offset-distance:0%}to{offset-distance:100%}}
.hw-spider{position:fixed;top:0;right:8%;z-index:41;pointer-events:none;display:flex;flex-direction:column;align-items:center;animation:hw-drop 9s ease-in-out infinite alternate}
.hw-spider::before{content:"";width:1px;height:90px;background:rgba(200,200,210,.7)}
.hw-spider span{font-size:26px;line-height:1}
@keyframes hw-drop{from{transform:translateY(0)}to{transform:translateY(40px)}}
.hw-web{position:fixed;top:0;left:0;width:120px;z-index:39;pointer-events:none;opacity:.22}
.hw-web.r{left:auto;right:0;transform:scaleX(-1);top:auto;bottom:0;transform:scale(-1,-1)}
.hw-badge{position:fixed;left:16px;bottom:16px;z-index:60;max-width:min(330px,calc(100vw - 120px));display:flex;gap:.7rem;align-items:center;padding:.8rem 2.2rem .8rem .9rem;border-radius:16px;background:linear-gradient(135deg,#1b1026,#3a1846);color:#fff;font:500 .88rem/1.35 var(--font-body,system-ui);box-shadow:0 12px 34px rgba(0,0,0,.35),0 0 0 1px rgba(255,138,31,.5);animation:hw-in .6s ease-out both}
.hw-badge b{color:#ff8a1f;display:block;font-family:var(--font-title,inherit)}
.hw-badge .hw-pk{font-size:2rem;animation:hw-glow 4s ease-in-out infinite alternate}
.hw-badge button{position:absolute;top:6px;right:8px;border:0;background:none;color:#fff;opacity:.7;font-size:1.1rem;cursor:pointer;padding:2px 6px}
.hw-badge button:hover{opacity:1}
@keyframes hw-in{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:none}}
@keyframes hw-glow{from{filter:drop-shadow(0 0 2px #ff8a1f)}to{filter:drop-shadow(0 0 7px #ff8a1f)}}
@media (max-width:700px){.hw-badge{bottom:84px;max-width:calc(100vw - 32px)}.hw-web{width:80px}.hw-bat{width:26px}.hw-spider{right:22%}.hw-crawl{width:22px;height:22px}}
html.hw-off .hw-layer,html.hw-off .hw-spider{display:none}`;
  const st = document.createElement("style"); st.id = "hw-style"; st.textContent = css; document.head.appendChild(st);
  const el = (cls, html, parent) => { const d = document.createElement("div"); d.className = cls; if (html) d.innerHTML = html; (parent || document.body).appendChild(d); return d; };

  {
    const layer = el("hw-layer"); layer.setAttribute("aria-hidden", "true");
    // Chauves-souris
    const batSvg = '<svg viewBox="0 0 64 32"><path fill="currentColor" d="M32 10c-2 0-3-3-3-3l-1 4c-4-1-6 1-6 1s-2-6-10-8c3 4 1 8 1 8s-6-3-13 0c5 1 7 6 7 6s5-2 9 1c3 2 6 6 10 7 2 1 4 2 6 2s4-1 6-2c4-1 7-5 10-7 4-3 9-1 9-1s2-5 7-6c-7-3-13 0-13 0s-2-4 1-8c-8 2-10 8-10 8s-2-2-6-1l-1-4s-1 3-3 3z"/></svg>';
    (mobile ? [[12, 40, 4]] : [[10, 38, 2], [24, 46, 20]]).forEach(([top, dur, delay]) => {
      const b = el("hw-bat", batSvg, layer); b.style.cssText = `top:${top}%;animation-duration:${dur}s;animation-delay:${delay}s`;
    });
    // Citrouilles 3D qui tournent
    const face = '<svg viewBox="0 0 40 30"><path fill="#ffe066" d="M6 6l7 3-7 4zM34 6l-7 3 7 4zM17 14h6l-3 4zM4 19c5 2 9 3 16 3s11-1 16-3c-2 6-8 9-16 9S6 25 4 19z"/><path fill="#ff7a00" d="M12 22h3v3h-3zM25 22h3v3h-3z"/></svg>';
    const pumps = mobile ? [] : [["right:2.5%;bottom:5%", 78, 0], ["left:1.5%;bottom:22%", 56, -4]];
    pumps.forEach(([pos, s, d]) => {
      const p = el("hw-pump", "", layer); p.style.cssText = pos + `;--s:${s}px;animation-delay:${d}s`;
      const inner = el("hw-pump-in", "", p); inner.style.animationDelay = d + "s";
      for (let i = 0; i < 8; i++) { const sl = document.createElement("i"); sl.style.transform = `rotateY(${i * 22.5}deg)`; inner.appendChild(sl); }
      inner.appendChild(document.createElement("b"));
      el("hw-face", face, inner);
    });
    // Araignées qui défilent sur l'écran
    const W = innerWidth, H = innerHeight;
    let legs = "";
    [[-1, 0], [-1, 1], [-1, 2], [-1, 3], [1, 0], [1, 1], [1, 2], [1, 3]].forEach(([s, k]) => {
      const y = 15 + k * 3.5, ex = 20 + s * 17, ey = y + (k - 1.5) * 5;
      legs += `<path class="lg ${s > 0 ? "r" : "l"}" d="M20 ${y} Q${20 + s * 11} ${y - 7} ${ex} ${ey}" stroke="#120a18" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;
    });
    const spiderSvg = `<svg viewBox="0 0 40 40">${legs}<ellipse cx="20" cy="25" rx="7" ry="9" fill="#1a1020"/><circle cx="20" cy="14" r="4.5" fill="#24152c"/><circle cx="18.3" cy="12.8" r="1.1" fill="#ff3b3b"/><circle cx="21.7" cy="12.8" r="1.1" fill="#ff3b3b"/><path d="M17 23l3 3 3-3M17 28l3 2 3-2" stroke="#ff8a1f" stroke-width="1" fill="none"/></svg>`;
    const routes = [
      [`M-50 ${H * .78} C ${W * .3} ${H * .62}, ${W * .55} ${H * .95}, ${W + 60} ${H * .7}`, 26, 0],
      [`M${W + 50} ${H * .2} C ${W * .7} ${H * .45}, ${W * .35} ${H * .05}, -60 ${H * .35}`, 32, 8],
      [`M${W * .15} -50 C ${W * .4} ${H * .3}, ${W * .05} ${H * .6}, ${W * .3} ${H + 60}`, 28, 15],
      [`M${W * .9} ${H + 50} C ${W * .6} ${H * .7}, ${W * .95} ${H * .35}, ${W * .7} -60`, 30, 4]
    ];
    (mobile ? [routes[0]] : [routes[0], routes[3]]).forEach(([path, dur, d]) => {
      const c = el("hw-crawl", spiderSvg, layer);
      c.style.offsetPath = `path("${path}")`; c.style.animationDuration = dur * 2.6 + "s"; c.style.animationDelay = -d + "s";
    });
    const sp = el("hw-spider", "<span>🕷️</span>"); sp.setAttribute("aria-hidden", "true");
  }
  const webSvg = '<svg viewBox="0 0 100 100" fill="none" stroke="#fff" stroke-width=".6"><path d="M0 0L100 30M0 0L80 80M0 0L30 100M0 0L100 0M0 0L0 100"/><path d="M0 20Q12 14 19 6Q14 12 20 0M0 40Q22 30 34 14Q30 6 40 0M0 62Q34 48 52 22Q50 10 62 0M0 84Q46 66 70 30Q70 14 84 0"/></svg>';
  el("hw-web", webSvg).setAttribute("aria-hidden", "true");
  if (!mobile) el("hw-web r", webSvg).setAttribute("aria-hidden", "true");

  let ferme = false; try { ferme = sessionStorage.getItem("hw-ferme") === "1"; } catch (e) {}
  if (ferme) document.documentElement.classList.add("hw-off");
  if (!ferme) {
    const badge = el("hw-badge", '<span class="hw-pk" aria-hidden="true">🎃</span><span><b>Joyeux Halloween !</b>Un ordinateur hanté ? RD IT Informatique chasse les bugs et les virus 👻</span><button type="button" aria-label="Fermer le message et arrêter les animations Halloween" title="Fermer et arrêter les animations">×</button>');
    badge.setAttribute("role", "note");
    badge.querySelector("button").addEventListener("click", () => { badge.remove(); document.documentElement.classList.add("hw-off"); try { sessionStorage.setItem("hw-ferme", "1"); } catch (e) {} });
  }
})();
