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
  const calme = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const css = `
:root{--lime:#ff8a1f;--mint:#a855f7}
.hw-layer{position:fixed;inset:0;pointer-events:none;z-index:40;overflow:hidden}
.hw-bat{position:absolute;left:-80px;width:46px;opacity:.7;color:#ff8a1f;filter:drop-shadow(0 0 6px rgba(168,85,247,.7));animation:hw-fly linear infinite}
.hw-bat svg{width:100%;height:auto;animation:hw-flap .25s ease-in-out infinite alternate;transform-origin:center}
@keyframes hw-fly{0%{transform:translate(0,0)}25%{transform:translate(28vw,-40px)}50%{transform:translate(55vw,30px)}75%{transform:translate(82vw,-25px)}100%{transform:translate(calc(100vw + 160px),10px)}}
@keyframes hw-flap{from{transform:scaleY(1)}to{transform:scaleY(.55)}}
.hw-spider{position:fixed;top:0;right:8%;z-index:41;pointer-events:none;display:flex;flex-direction:column;align-items:center;animation:hw-drop 5s ease-in-out infinite alternate}
.hw-spider::before{content:"";width:1px;height:var(--hw-fil,90px);background:rgba(200,200,210,.7)}
.hw-spider span{font-size:26px;line-height:1}
@keyframes hw-drop{from{transform:translateY(0)}to{transform:translateY(70px)}}
.hw-web{position:fixed;top:0;left:0;width:130px;z-index:39;pointer-events:none;opacity:.35}
.hw-badge{position:fixed;left:16px;bottom:16px;z-index:60;max-width:min(330px,calc(100vw - 120px));display:flex;gap:.7rem;align-items:center;padding:.8rem 2.2rem .8rem .9rem;border-radius:16px;background:linear-gradient(135deg,#1b1026,#3a1846);color:#fff;font:500 .88rem/1.35 var(--font-body,system-ui);box-shadow:0 12px 34px rgba(0,0,0,.35),0 0 0 1px rgba(255,138,31,.5);animation:hw-in .6s ease-out both}
.hw-badge b{color:#ff8a1f;display:block;font-family:var(--font-title,inherit)}
.hw-badge .hw-pk{font-size:2rem;animation:hw-glow 1.6s ease-in-out infinite alternate}
.hw-badge button{position:absolute;top:6px;right:8px;border:0;background:none;color:#fff;opacity:.7;font-size:1.1rem;cursor:pointer;padding:2px 6px}
.hw-badge button:hover{opacity:1}
@keyframes hw-in{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:none}}
@keyframes hw-glow{from{filter:drop-shadow(0 0 2px #ff8a1f)}to{filter:drop-shadow(0 0 12px #ff8a1f)}}
@media (max-width:700px){.hw-badge{bottom:84px;max-width:calc(100vw - 32px)}.hw-web{width:80px}.hw-bat{width:32px}.hw-spider{right:22%}}
@media (prefers-reduced-motion:reduce){.hw-bat,.hw-spider,.hw-badge .hw-pk{animation:none}.hw-layer{display:none}}`;
  const st = document.createElement("style"); st.id = "hw-style"; st.textContent = css; document.head.appendChild(st);

  const batSvg = '<svg viewBox="0 0 64 32" aria-hidden="true"><path fill="currentColor" d="M32 10c-2 0-3-3-3-3l-1 4c-4-1-6 1-6 1s-2-6-10-8c3 4 1 8 1 8s-6-3-13 0c5 1 7 6 7 6s5-2 9 1c3 2 6 6 10 7 2 1 4 2 6 2s4-1 6-2c4-1 7-5 10-7 4-3 9-1 9-1s2-5 7-6c-7-3-13 0-13 0s-2-4 1-8c-8 2-10 8-10 8s-2-2-6-1l-1-4s-1 3-3 3z"/></svg>';
  if (!calme) {
    const layer = document.createElement("div"); layer.className = "hw-layer";
    [[8, 14, 0], [22, 19, 6], [12, 23, 11], [30, 17, 3]].forEach(([top, dur, delay]) => {
      const b = document.createElement("div"); b.className = "hw-bat";
      b.style.top = top + "%"; b.style.animationDuration = dur + "s"; b.style.animationDelay = delay + "s";
      b.innerHTML = batSvg; layer.appendChild(b);
    });
    document.body.appendChild(layer);
    const sp = document.createElement("div"); sp.className = "hw-spider"; sp.innerHTML = "<span>🕷️</span>"; sp.setAttribute("aria-hidden", "true");
    document.body.appendChild(sp);
  }
  const web = document.createElement("div"); web.className = "hw-web"; web.setAttribute("aria-hidden", "true");
  web.innerHTML = '<svg viewBox="0 0 100 100" fill="none" stroke="#fff" stroke-width=".6"><path d="M0 0L100 30M0 0L80 80M0 0L30 100M0 0L100 0M0 0L0 100"/><path d="M0 20Q12 14 19 6Q14 12 20 0M0 40Q22 30 34 14Q30 6 40 0M0 62Q34 48 52 22Q50 10 62 0M0 84Q46 66 70 30Q70 14 84 0"/></svg>';
  document.body.appendChild(web);

  let ferme = false; try { ferme = sessionStorage.getItem("hw-ferme") === "1"; } catch (e) {}
  if (!ferme) {
    const badge = document.createElement("div"); badge.className = "hw-badge"; badge.setAttribute("role", "note");
    badge.innerHTML = '<span class="hw-pk" aria-hidden="true">🎃</span><span><b>Joyeux Halloween !</b>Un ordinateur hanté ? RD IT Informatique chasse les bugs et les virus 👻</span><button type="button" aria-label="Fermer le message Halloween">×</button>';
    badge.querySelector("button").addEventListener("click", () => { badge.remove(); try { sessionStorage.setItem("hw-ferme", "1"); } catch (e) {} });
    document.body.appendChild(badge);
  }
})();
