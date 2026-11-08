// RD IT Informatique — effets 3D : cartes inclinables, ordinateur 3D dans l'en-tête, profondeur au défilement.
// Sans bibliothèque externe. Respecte « réduire les animations » et s'adapte au tactile.
(() => {
  const calme = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const souris = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  /* ---------- 1. Cartes inclinables ---------- */
  if (souris && !calme) {
    const cibles = [
      [".service-card.flip, .card, .review-card, .related a", 10, true],
      [".promo-cadre-panel, .promo-vhs-panel, .zone-inner, .hero-photo", 3.5, false]
    ];
    cibles.forEach(([sel, max, reflet]) => {
      document.querySelectorAll(sel).forEach((el) => {
        el.classList.add("fx-tilt");
        if (reflet) el.classList.add("fx-glare");
        let raf = 0;
        el.addEventListener("pointermove", (e) => {
          const r = el.getBoundingClientRect();
          const px = (e.clientX - r.left) / r.width - .5, py = (e.clientY - r.top) / r.height - .5;
          cancelAnimationFrame(raf);
          raf = requestAnimationFrame(() => {
            el.style.setProperty("--rx", (-py * max).toFixed(2) + "deg");
            el.style.setProperty("--ry", (px * max).toFixed(2) + "deg");
            el.style.setProperty("--gx", ((px + .5) * 100).toFixed(1) + "%");
            el.style.setProperty("--gy", ((py + .5) * 100).toFixed(1) + "%");
            el.classList.add("is-tilting");
          });
        });
        el.addEventListener("pointerleave", () => {
          cancelAnimationFrame(raf);
          el.classList.remove("is-tilting");
          el.style.setProperty("--rx", "0deg");
          el.style.setProperty("--ry", "0deg");
        });
      });
    });
  }

  /* ---------- 2. Ordinateur 3D dans l'en-tête de l'accueil ---------- */
  const art = document.querySelector(".hero .hero-art");
  if (art && document.createElement("canvas").getContext) {
    const cv = document.createElement("canvas");
    cv.className = "fx-3d-canvas";
    cv.setAttribute("aria-hidden", "true");
    art.prepend(cv);
    art.classList.add("has-3d");
    const ctx = cv.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let S = 0, redessine = () => {};
    const taille = () => {
      const r = cv.getBoundingClientRect();
      S = Math.max(160, Math.round(Math.min(r.width, r.height)));
      cv.width = S * dpr; cv.height = S * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      redessine(); // changer la taille efface le canevas : on redessine aussitôt
    };
    taille();
    let attente; window.addEventListener("resize", () => { clearTimeout(attente); attente = setTimeout(taille, 150); });

    // Sphère de points (répartition de Fibonacci) et liaisons entre voisins
    const N = 110, sphere = [];
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2, rr = Math.sqrt(1 - y * y), th = i * 2.39996;
      sphere.push([Math.cos(th) * rr, y, Math.sin(th) * rr]);
    }
    const liens = [];
    for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
      const a = sphere[i], b = sphere[j];
      if (Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) < .36) liens.push([i, j]);
    }

    // Ordinateur portable : socle + écran incliné (coordonnées, y vers le haut)
    const boite = (x0, x1, y0, y1, z0, z1) => [[x0,y0,z0],[x1,y0,z0],[x1,y1,z0],[x0,y1,z0],[x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1]];
    const FACES = [[0,1,2,3],[5,4,7,6],[4,0,3,7],[1,5,6,2],[3,2,6,7],[4,5,1,0]]; // arrière, avant, gauche, droite, dessus, dessous
    const W = .62, D = .42, by = -.30, bh = .045;
    const socle = boite(-W, W, by - bh, by, -D, D);
    const ang = 1.86; // ouverture de l'écran (~107°)
    const charniere = (p) => { // pivote autour de l'axe x passant par l'arrière du socle
      const y = p[1], z = p[2], c = Math.cos(ang - Math.PI / 2), s = Math.sin(ang - Math.PI / 2);
      return [p[0], by + y * c - z * s, -D + y * s + z * c];
    };
    const HE = .82, EP = .03;
    const ecran = boite(-W, W, 0, HE, -EP, 0).map(charniere);
    const surEcran = (u, v) => charniere([-u * W * .9, .06 + v * (HE - .12), .002]);
    const surSocle = (u, v) => [-u * W * .86, by + .001, -D * .78 + v * D * 1.25];

    let t = 0, tb = 0, mx = 0, my = 0, cx = 0, cy = 0, visible = true, tourne = false;
    if (souris) {
      window.addEventListener("pointermove", (e) => {
        mx = e.clientX / innerWidth - .5; my = e.clientY / innerHeight - .5;
      }, { passive: true });
    }

    const dessine = () => {
      cx += (mx - cx) * .05; cy += (my - cy) * .05;
      const yaw = Math.PI + Math.sin(t * .45) * .55 - cx * .9 + .35;
      const pitch = -.38 - cy * .35 + Math.sin(t * .6) * .04;
      const cyw = Math.cos(yaw), syw = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
      const R = S * .36, F = 3.2, ox = S / 2, oy = S / 2;
      const proj = (p, spin) => {
        let [x, y, z] = p;
        if (spin) { const c = Math.cos(spin), s = Math.sin(spin); [x, z] = [x * c - z * s, x * s + z * c]; }
        let x1 = x * cyw - z * syw, z1 = x * syw + z * cyw;
        let y1 = y * cp - z1 * sp, z2 = y * sp + z1 * cp;
        const k = F / (F + z2);
        return [ox + x1 * R * k, oy - y1 * R * k, z2, k];
      };
      ctx.clearRect(0, 0, S, S);

      // Halo central
      const g = ctx.createRadialGradient(ox, oy, 0, ox, oy, R * 1.25);
      g.addColorStop(0, "rgba(0,229,255,.16)"); g.addColorStop(1, "rgba(0,229,255,0)");
      ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);

      // Sphère réseau (tourne lentement sur elle-même)
      const spin = t * .18;
      const pts = sphere.map((p) => proj([p[0] * 1.18, p[1] * 1.18, p[2] * 1.18], spin));
      ctx.lineWidth = 1;
      for (const [i, j] of liens) {
        const a = pts[i], b = pts[j], z = (a[2] + b[2]) / 2;
        const al = .05 + (1 - (z + 1.2) / 2.4) * .22;
        ctx.strokeStyle = "rgba(0,229,255," + al.toFixed(3) + ")";
        ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
      }
      pts.forEach((p, i) => {
        const prof = 1 - (p[2] + 1.2) / 2.4;
        ctx.fillStyle = i % 6 ? "rgba(0,229,255," + (.25 + prof * .7).toFixed(2) + ")" : "rgba(61,139,255," + (.35 + prof * .6).toFixed(2) + ")";
        ctx.beginPath(); ctx.arc(p[0], p[1], .7 + prof * 1.9 * p[3], 0, 6.283); ctx.fill();
        // Lumières bleues qui clignotent sur certains nœuds
        if (i % 3 === 0) {
          const sc = Math.pow(Math.max(0, Math.sin(tb * 1.7 + i * 2.17)), 12) * (.45 + prof * .55);
          if (sc > .03) etoile(p, (5 + prof * 7) * (.6 + sc * .6), i % 2 ? "61,139,255" : "0,229,255", sc);
        }
      });

      // Anneau orbital avec un point lumineux
      ctx.strokeStyle = "rgba(61,139,255,.35)"; ctx.lineWidth = 1.2; ctx.beginPath();
      for (let k = 0; k <= 72; k++) {
        const a = k / 72 * 6.283, q = proj([Math.cos(a) * 1.42, Math.sin(a) * .18 - .1, Math.sin(a) * 1.42]);
        k ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]);
      }
      ctx.stroke();
      // Second anneau incliné, en pointillés
      const al = .95, r2 = 1.3;
      ctx.strokeStyle = "rgba(0,229,255,.22)"; ctx.setLineDash([3, 6]); ctx.beginPath();
      for (let k = 0; k <= 72; k++) {
        const a = k / 72 * 6.283, q = proj([Math.cos(a) * r2, Math.sin(a) * r2 * Math.sin(al), Math.sin(a) * r2 * Math.cos(al)]);
        k ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]);
      }
      ctx.stroke(); ctx.setLineDash([]);
      // Satellites lumineux qui pulsent
      const sats = [0, 2.1, 4.2].map((ph, k) => {
        const a = t * (k === 1 ? -.7 : .9) + ph;
        const pos = k === 1
          ? [Math.cos(a) * r2, Math.sin(a) * r2 * Math.sin(al), Math.sin(a) * r2 * Math.cos(al)]
          : [Math.cos(a) * 1.42, Math.sin(a) * .18 - .1, Math.sin(a) * 1.42];
        return { p: proj(pos), puls: .55 + .45 * Math.pow(Math.sin(tb * 2.4 + ph * 1.3) * .5 + .5, 2), coul: k === 1 ? "61,139,255" : "0,229,255" };
      });

      // Ordinateur : faces triées de la plus lointaine à la plus proche
      const faces = [];
      const ajoute = (sommets, type) => {
        const P = sommets.map((p) => proj(p));
        FACES.forEach((f, idx) => {
          const q = f.map((n) => P[n]);
          const aire = (q[1][0] - q[0][0]) * (q[2][1] - q[0][1]) - (q[1][1] - q[0][1]) * (q[2][0] - q[0][0]);
          faces.push({ q, z: q.reduce((s, v) => s + v[2], 0) / 4, type, idx, face: aire < 0 });
        });
      };
      ajoute(socle, "socle"); ajoute(ecran, "ecran");
      sats.filter((o) => o.p[2] >= 0).forEach((o) => etoile(o.p, 11 * o.puls, o.coul, 1));
      faces.sort((a, b) => b.z - a.z).forEach((f) => {
        if (!f.face) return;
        ctx.beginPath(); f.q.forEach((v, n) => n ? ctx.lineTo(v[0], v[1]) : ctx.moveTo(v[0], v[1])); ctx.closePath();
        const dalle = f.type === "ecran" && f.idx === 1, dessus = f.type === "socle" && f.idx === 4;
        if (dalle) {
          const lg = ctx.createLinearGradient(f.q[3][0], f.q[3][1], f.q[1][0], f.q[1][1]);
          lg.addColorStop(0, "rgba(10,40,75,.95)"); lg.addColorStop(1, "rgba(6,18,36,.95)");
          ctx.fillStyle = lg;
        } else ctx.fillStyle = dessus ? "rgba(14,32,58,.95)" : "rgba(9,20,38,.96)";
        ctx.fill();
        ctx.strokeStyle = dalle ? "rgba(0,229,255,.9)" : "rgba(0,229,255,.45)";
        ctx.lineWidth = dalle ? 1.4 : 1;
        ctx.shadowColor = "rgba(0,229,255,.6)"; ctx.shadowBlur = dalle ? 12 : 0;
        ctx.stroke(); ctx.shadowBlur = 0;
        if (dalle) contenuEcran();
        if (dessus) clavier();
      });
      sats.filter((o) => o.p[2] < 0).forEach((o) => etoile(o.p, 11 * o.puls, o.coul, 1));
      // Voyants bleus d'activité à l'avant du socle
      [[.62, 9, 13.7], [.72, 6.3, 11.1]].forEach(([u, f1, f2], k) => {
        const on = Math.sin(tb * f1 + k) + Math.sin(tb * f2) > .2;
        const q = proj([-u * W, by - bh / 2, D + .004]);
        if (q[2] < .3) etoile(q, on ? 7 : 3, "0,229,255", on ? 1 : .35);
      });

      function ligne(a, b, couleur, ep) {
        const p = proj(a), q = proj(b);
        ctx.strokeStyle = couleur; ctx.lineWidth = ep; ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.stroke();
      }
      function contenuEcran() {
        ctx.lineCap = "round";
        ligne(surEcran(-.85, .88), surEcran(-.2, .88), "rgba(0,229,255,.95)", 2.2);      // titre « RD IT »
        ligne(surEcran(.62, .88), surEcran(.68, .88), Math.floor(tb * 1.6) % 2 ? "rgba(34,197,94,.95)" : "rgba(34,197,94,.25)", 3); // voyant vert qui clignote
        ligne(surEcran(.76, .88), surEcran(.82, .88), Math.sin(tb * 7) > 0 ? "rgba(61,139,255,1)" : "rgba(61,139,255,.25)", 3); // voyant bleu
        for (let k = 0; k < 3; k++) {
          const v = .62 - k * .22, l = .35 + .3 * (Math.sin(tb * 1.3 + k * 1.7) * .5 + .5);
          ligne(surEcran(-.85, v), surEcran(.85, v), "rgba(0,229,255,.14)", 6);
          ligne(surEcran(-.85, v), surEcran(-.85 + 1.7 * l, v), "rgba(0,229,255,.85)", 2.4);
        }
        const bal = ((tb * .35) % 1) * 1.1 - .05; // balayage lumineux
        if (bal > 0 && bal < 1) ligne(surEcran(-.88, 1 - bal), surEcran(.88, 1 - bal), "rgba(0,229,255,.25)", 3);
        ctx.lineCap = "butt";
      }
      function clavier() {
        for (let r = 0; r < 4; r++) ligne(surSocle(-1, r * .14), surSocle(1, r * .14), "rgba(0,229,255,.18)", 1);
        for (let c = -6; c <= 6; c++) ligne(surSocle(c / 6, 0), surSocle(c / 6, .42), "rgba(0,229,255,.12)", 1);
        const a = surSocle(-.32, .62), b = surSocle(.32, .62), c2 = surSocle(.32, .9), d = surSocle(-.32, .9);
        const P = [a, b, c2, d].map((p) => proj(p));
        ctx.strokeStyle = "rgba(0,229,255,.3)"; ctx.lineWidth = 1; ctx.beginPath();
        P.forEach((v, n) => n ? ctx.lineTo(v[0], v[1]) : ctx.moveTo(v[0], v[1])); ctx.closePath(); ctx.stroke();
      }
      function etoile(p, taille = 10, coul = "0,229,255", force = 1) {
        const rr = taille * p[3];
        const rg = ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], rr);
        rg.addColorStop(0, "rgba(255,255,255," + force + ")"); rg.addColorStop(.3, "rgba(" + coul + "," + (.9 * force) + ")"); rg.addColorStop(1, "rgba(" + coul + ",0)");
        ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(p[0], p[1], rr, 0, 6.283); ctx.fill();
      }
    };

    // Une seule boucle. Si « réduire les animations » est activé, l'ordinateur ne tourne pas tout seul
    // (il suit seulement la souris) mais les voyants et lumières continuent de clignoter doucement.
    if (calme) t = .8;
    redessine = dessine;
    let avant = performance.now();
    const boucle = (now) => {
      if (!visible || document.hidden) { tourne = false; return; }
      const dt = Math.min(now - avant, 50) / 1000; avant = now;
      tb += dt; if (!calme) t += dt;
      dessine(); requestAnimationFrame(boucle);
    };
    const lance = () => { if (!tourne && visible && !document.hidden) { tourne = true; avant = performance.now(); requestAnimationFrame(boucle); } };
    new IntersectionObserver(([en]) => { visible = en.isIntersecting; lance(); }).observe(art);
    document.addEventListener("visibilitychange", lance);
    dessine();
  }

  /* ---------- 3. Profondeur au défilement (parallaxe) ---------- */
  if (calme) return;
  const couches = [];
  const ajoute = (sel, vitesse, opts = {}) => document.querySelectorAll(sel).forEach((el) => couches.push({ el, vitesse, ...opts }));
  ajoute(".hero .hero-content, .page-hero .wrap", .18, { fondu: true, haut: true });
  ajoute(".hero .hero-art", -.12, { haut: true });
  ajoute(".hero .fx-canvas, .page-hero .fx-canvas", .45, { haut: true });
  ajoute(".promo-cadre-img, .promo-vhs-visual img, .hero-photo img", -.07);
  ajoute(".web-core", -.05);
  if (!couches.length) return;

  // Puces flottantes de l'accueil : légère profondeur qui suit la souris
  const puces = [...document.querySelectorAll(".hero .floating-chip")];
  let pmx = 0, pmy = 0;
  if (souris && puces.length) window.addEventListener("pointermove", (e) => { pmx = e.clientX / innerWidth - .5; pmy = e.clientY / innerHeight - .5; demande(); }, { passive: true });

  let attendu = false;
  const maj = () => {
    attendu = false;
    const sy = window.scrollY, vh = innerHeight;
    for (const c of couches) {
      if (c.haut) {
        if (sy > vh * 1.2) continue;
        c.el.style.translate = "0 " + (sy * c.vitesse).toFixed(1) + "px";
        if (c.fondu) c.el.style.opacity = Math.max(0, 1 - sy / (vh * .85)).toFixed(3);
      } else {
        const r = c.el.getBoundingClientRect();
        if (r.bottom < -100 || r.top > vh + 100) continue;
        const centre = r.top + r.height / 2 - vh / 2;
        c.el.style.translate = "0 " + (centre * c.vitesse).toFixed(1) + "px";
      }
    }
    puces.forEach((p, i) => { const k = i ? -18 : 26; p.style.translate = (pmx * k).toFixed(1) + "px " + (pmy * k).toFixed(1) + "px"; });
  };
  const demande = () => { if (!attendu) { attendu = true; requestAnimationFrame(maj); } };
  window.addEventListener("scroll", demande, { passive: true });
  window.addEventListener("resize", demande);
  maj();
})();
