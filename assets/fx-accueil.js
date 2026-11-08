// RD IT Informatique — effets futuristes de l'en-tête de l'accueil.
// Grille néon, faisceaux, halo souris, cadre HUD, console tapée, titre décodé + glitch.
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
  if (art) art.appendChild(el("div", "fx-hud", "<i></i><i></i><i></i><i></i><b></b><em>SYS.SCAN // RD-IT</em><em>STATUT : <span class=\"ok\">EN LIGNE</span></em>"));

  /* 3. Apparition en cascade */
  if (!calme) {
    document.documentElement.classList.add("fx-intro");
    setTimeout(() => document.documentElement.classList.remove("fx-intro"), 2600);
  }

  /* 4. Console HUD tapée sous le texte d'accroche */
  const copie = hero.querySelector(".hero-copy");
  if (copie) {
    const term = el("div", "fx-term", '<span class="dot"></span><span class="prompt">rd-it&gt;</span><span class="txt"></span><span class="caret"></span>');
    copie.after(term);
    const zone = term.querySelector(".txt");
    const lignes = [
      ["diagnostic du système", "OK"],
      ["suppression des virus", "100 %"],
      ["sauvegarde de vos données", "OK"],
      ["optimisation du démarrage", "x2"],
      ["mise à jour Windows 11", "OK"],
      ["technicien disponible", "06 95 95 40 56"]
    ];
    if (calme) {
      zone.innerHTML = lignes[0][0] + ' … <span class="ok">' + lignes[0][1] + "</span>";
    } else {
      let i = 0;
      const tape = () => {
        const [txt, res] = lignes[i % lignes.length];
        let n = 0;
        const pas = () => {
          zone.textContent = txt.slice(0, ++n);
          if (n < txt.length) return setTimeout(pas, 32 + Math.random() * 40);
          let pts = 0;
          const points = () => {
            zone.textContent = txt + " " + ".".repeat(++pts);
            if (pts < 4) return setTimeout(points, 180);
            zone.innerHTML = txt + ' .... <span class="ok">' + res + "</span>";
            i++; setTimeout(tape, 2100);
          };
          setTimeout(points, 200);
        };
        pas();
      };
      setTimeout(tape, 900);
    }
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
