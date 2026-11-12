// RD IT Informatique — effets futuristes de l'en-tête de l'accueil.
// Grille néon, faisceaux, halo souris, cadre HUD, titre décodé + glitch.
// Sans bibliothèque. Décoratif uniquement (aria-hidden) ; respecte « réduire les animations ».
(() => {
  const hero = document.querySelector(".hero");
  if (!hero) return;
  const calme = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const el = (tag, cls, html) => { const n = document.createElement(tag); if (cls) n.className = cls; if (html) n.innerHTML = html; n.setAttribute("aria-hidden", "true"); return n; };

  /* 1. Calques de fond : grille, balayage, halo, faisceaux */
  const avant = hero.querySelector(".wrap");
  hero.insertBefore(el("div", "fx-grid"), avant);
  hero.insertBefore(el("div", "fx-scanline"), avant);
  const spot = el("div", "fx-spot");
  hero.insertBefore(spot, avant);
  if (!calme) {
    [["14%", "#00e5ff", "6s", "0s"], ["38%", "#3d8bff", "8s", "2.4s"], ["63%", "#ff3dc8", "7s", "4.1s"], ["82%", "#00e5ff", "9s", "1.2s"]]
      .forEach(([top, c, d, delay]) => {
        const b = el("span", "fx-beam");
        b.style.top = top; b.style.setProperty("--c", c); b.style.setProperty("--d", d); b.style.setProperty("--delay", delay);
        hero.insertBefore(b, avant);
      });
    let raf = 0;
    hero.addEventListener("pointermove", (e) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = hero.getBoundingClientRect();
        spot.style.setProperty("--sx", (e.clientX - r.left) + "px");
        spot.style.setProperty("--sy", (e.clientY - r.top) + "px");
      });
    }, { passive: true });
  }

  /* 2. Cadre HUD autour de l'ordinateur 3D */
  const art = hero.querySelector(".hero-art");
  if (art) art.appendChild(el("div", "fx-hud", "<b></b>"));

  /* 3. Apparition en cascade */
  if (!calme) {
    document.documentElement.classList.add("fx-intro");
    setTimeout(() => document.documentElement.classList.remove("fx-intro"), 2600);
  }

  /* 5. Titre : la partie colorée se « décode », puis glitch de temps en temps */
  const h1 = hero.querySelector("h1");
  const cible = h1 && h1.querySelector("span");
  if (cible && !calme) {
    const final = cible.textContent;
    const signes = "01<>/\\#%&@$=+*ABCDEFXYZ";
    const debut = performance.now(), duree = 1100;
    const decode = (now) => {
      const p = Math.min(1, (now - debut - 350) / duree);
      if (p < 0) return requestAnimationFrame(decode);
      const fixe = Math.floor(final.length * p);
      let html = final.slice(0, fixe);
      for (let k = fixe; k < final.length; k++) {
        const c = final[k];
        html += c === " " ? " " : '<i class="scr" style="font-style:normal">' + signes[(Math.random() * signes.length) | 0] + "</i>";
      }
      cible.innerHTML = html;
      if (p < 1) requestAnimationFrame(decode); else cible.textContent = final;
    };
    requestAnimationFrame(decode);
    const glitch = () => {
      if (!document.hidden) {
        h1.classList.add("is-glitching");
        setTimeout(() => h1.classList.remove("is-glitching"), 400);
      }
      setTimeout(glitch, 4500 + Math.random() * 4000);
    };
    setTimeout(glitch, 3500);
  }
})();
