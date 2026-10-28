// =====================================================================
//  RDV Cabinet — MODE DÉMONSTRATION
//  Remplace Supabase par une base simulée dans le navigateur
//  (données fictives, partagées entre la vue patient et l'espace praticien).
// =====================================================================
(function () {
  const KEY = "rdv-demo-v2", SKEY = "rdv-demo-session", TZ = "Europe/Paris";
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch {} },
    del(k) { try { localStorage.removeItem(k); } catch {} },
  };
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() :
    "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === "x" ? r : (r & 3 | 8)).toString(16); }));
  const clone = o => JSON.parse(JSON.stringify(o));
  const E = (message, code) => ({ message, code });

  // ---------- Fuseau horaire du cabinet ----------
  function tzOffsetMin(date) {
    const p = new Intl.DateTimeFormat("en-US", { timeZone: TZ, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }).formatToParts(date);
    const g = t => +p.find(x => x.type === t).value;
    return Math.round((Date.UTC(g("year"), g("month") - 1, g("day"), g("hour"), g("minute"), g("second")) - date.getTime()) / 60000);
  }
  function wall(ds, hhmm) {
    const [y, m, d] = ds.split("-").map(Number), [h, mi] = hhmm.split(":").map(Number);
    const guess = Date.UTC(y, m - 1, d, h, mi);
    let t = guess - tzOffsetMin(new Date(guess)) * 60000;
    t = guess - tzOffsetMin(new Date(t)) * 60000;
    return new Date(t);
  }
  const todayTZ = () => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
  const dayOf = d => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date(d));
  const addDays = (ds, n) => { const [y, m, d] = ds.split("-").map(Number); return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10); };
  const isoDow = ds => { const [y, m, d] = ds.split("-").map(Number); const w = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); return w === 0 ? 7 : w; };
  const iso = d => new Date(d).toISOString();

  // ---------- Données fictives ----------
  function seed() {
    let s = 20261028;
    const rnd = () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    const pick = a => a[Math.floor(rnd() * a.length)];
    const now = new Date().toISOString();
    const C = "c0000000-0000-4000-8000-000000000001", P1 = "p0000000-0000-4000-8000-000000000001", P2 = "p0000000-0000-4000-8000-000000000002";
    const U1 = "u0000000-0000-4000-8000-000000000001", U2 = "u0000000-0000-4000-8000-000000000002";
    const S1 = "s0000000-0000-4000-8000-000000000001", S2 = "s0000000-0000-4000-8000-000000000002", S3 = "s0000000-0000-4000-8000-000000000003";
    const db = {
      users: [{ id: U1, email: "claire@kine-lilas.fr", password: "demo" }, { id: U2, email: "thomas@kine-lilas.fr", password: "demo" }],
      cabinets: [{ id: C, slug: "demo-kine", nom: "Cabinet de kinésithérapie des Lilas", adresse: "12 rue des Lilas, 35000 Rennes",
        telephone: "02 99 00 00 00", email: "contact@kine-lilas.fr", site_web: "https://kine-lilas.fr", url_reservation: "https://rdv.kine-lilas.fr",
        message_accueil: "Prenez rendez-vous en ligne 24h/24. Pensez à apporter votre ordonnance et votre carte Vitale.",
        couleur: "#0f766e", fuseau: TZ, pas_minutes: 15, delai_min_heures: 2, delai_annulation_heures: 24, horizon_jours: 60, actif: true, created_at: now }],
      praticiens: [
        { id: P1, cabinet_id: C, user_id: U1, nom: "Claire Martin", specialite: "Masseur-kinésithérapeute", email: "claire@kine-lilas.fr", couleur: "#0f766e", est_admin: true, actif: true, ordre: 1, created_at: now },
        { id: P2, cabinet_id: C, user_id: null, nom: "Thomas Le Gall", specialite: "Kinésithérapeute du sport", email: "thomas@kine-lilas.fr", couleur: "#b45309", est_admin: false, actif: true, ordre: 2, created_at: now },
      ],
      prestations: [
        { id: S1, cabinet_id: C, nom: "Séance de rééducation", description: "Séance sur prescription médicale", duree_minutes: 30, prix: 16.13, praticiens: null, reservable_en_ligne: true, actif: true, ordre: 1, created_at: now },
        { id: S2, cabinet_id: C, nom: "Bilan initial", description: "Première séance : bilan et définition du programme", duree_minutes: 45, prix: null, praticiens: null, reservable_en_ligne: true, actif: true, ordre: 2, created_at: now },
        { id: S3, cabinet_id: C, nom: "Kiné du sport", description: "Rééducation post-traumatique, reprise sportive", duree_minutes: 45, prix: 45, praticiens: [P2], reservable_en_ligne: true, actif: true, ordre: 3, created_at: now },
      ],
      horaires: [], absences: [], rdv: [], patients: [],
    };
    for (let j = 1; j <= 5; j++) {
      db.horaires.push({ id: uid(), praticien_id: P1, jour: j, debut: "08:30", fin: "12:30" }, { id: uid(), praticien_id: P1, jour: j, debut: "14:00", fin: "19:00" },
                       { id: uid(), praticien_id: P2, jour: j, debut: "09:00", fin: "13:00" }, { id: uid(), praticien_id: P2, jour: j, debut: "14:30", fin: "19:30" });
    }
    db.horaires.push({ id: uid(), praticien_id: P2, jour: 6, debut: "09:00", fin: "12:30" });

    const today = todayTZ();
    // Une formation de Thomas l'après-midi, dans quelques jours ouvrés
    let jf = addDays(today, 4); while (isoDow(jf) > 5) jf = addDays(jf, 1);
    db.absences.push({ id: uid(), praticien_id: P2, debut: iso(wall(jf, "14:00")), fin: iso(wall(jf, "20:00")), motif: "Formation" });

    const noms = ["DUPONT Jean", "BERNARD Lucie", "MOREAU Paul", "LEFEBVRE Emma", "GUÉGAN Yann", "LE ROUX Sophie", "PETIT Hugo", "ROBIN Camille", "GAUTIER Louis", "MARCHAND Chloé",
      "FAUCHEUX Anne", "BOUVIER Marc", "LE GOFF Léa", "TANGUY Pierre", "RENAUD Inès", "COLIN Julien", "HAMON Nathalie", "PERRIN Théo", "CARRÉ Manon", "JOLY Bernard",
      "LECLERC Sarah", "MENARD Gilles", "BRIAND Zoé", "OLLIVIER Hervé", "PRIGENT Maëlle"];
    const sansAccent = x => x.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s/g, "");
    const notesDemo = ["Ordonnance : 10 séances genou droit", "Lombalgie chronique, préfère les créneaux du matin", "Suite entorse cheville, reprise du running prévue", "Rééducation épaule après chirurgie", "Diabétique, prévoir collation"];
    for (const n of noms) {
      const parts = n.split(" "), prenom = parts[parts.length - 1], nom = parts.slice(0, -1).join(" ");
      const tel = `06 ${String(10 + Math.floor(rnd() * 89))} ${String(10 + Math.floor(rnd() * 89))} ${String(10 + Math.floor(rnd() * 89))} ${String(10 + Math.floor(rnd() * 89))}`;
      const an = 1945 + Math.floor(rnd() * 60), mois = 1 + Math.floor(rnd() * 12), jour = 1 + Math.floor(rnd() * 28);
      db.patients.push({ id: uid(), cabinet_id: C, nom, prenom, email: `${sansAccent(prenom)}.${sansAccent(nom)}@exemple.fr`, telephone: tel,
        date_naissance: rnd() < 0.7 ? `${an}-${String(mois).padStart(2, "0")}-${String(jour).padStart(2, "0")}` : null,
        notes: rnd() < 0.3 ? pick(notesDemo) : null, created_at: now, updated_at: now });
    }
    const nowMs = Date.now();
    for (let k = -4; k <= 12; k++) {
      const ds = addDays(today, k), dow = isoDow(ds);
      const futur = k >= 0, taux = k < 0 ? 0.75 : k === 0 ? 0.55 : k <= 5 ? 0.5 : 0.3;
      for (const h of db.horaires.filter(x => x.jour === dow)) {
        let t = wall(ds, h.debut).getTime(); const fin = wall(ds, h.fin).getTime();
        while (t + 30 * 60000 <= fin) {
          const presta = h.praticien_id === P2 && rnd() < 0.35 ? S3 : rnd() < 0.15 ? S2 : S1;
          const dur = presta === S1 ? 30 : 45;
          if (t + dur * 60000 > fin) break;
          const absent = db.absences.some(a => a.praticien_id === h.praticien_id && Date.parse(a.debut) < t + dur * 60000 && Date.parse(a.fin) > t);
          if (!absent && rnd() < taux) {
            const pa = pick(db.patients);
            const passe = t < nowMs;
            const statut = passe ? (rnd() < 0.06 ? "absent" : "honore") : (rnd() < 0.05 ? "annule" : "confirme");
            db.rdv.push({ id: uid(), cabinet_id: C, praticien_id: h.praticien_id, prestation_id: presta, debut: iso(t), fin: iso(t + dur * 60000),
              patient_id: pa.id, patient_nom: pa.nom, patient_prenom: pa.prenom, patient_email: pa.email, patient_tel: pa.telephone,
              note: rnd() < 0.12 ? pick(["Douleur genou droit", "Suite entorse cheville", "Lombalgie", "Rééducation épaule"]) : null,
              statut, source: futur && rnd() < 0.4 ? "en_ligne" : (rnd() < 0.25 ? "en_ligne" : "cabinet"), annule_par: statut === "annule" ? "patient" : null,
              token: uid(), rappel_envoye: passe, created_at: now, updated_at: now });
            t += dur * 60000;
          } else t += (rnd() < 0.5 ? 30 : 45) * 60000;
        }
      }
    }
    return db;
  }

  let db;
  function sync() { const s = store.get(KEY); if (s) { try { db = JSON.parse(s); return; } catch {} } if (!db) { db = seed(); save(); } }
  function save() { store.set(KEY, JSON.stringify(db)); }
  sync();

  const actifs = r => r.statut !== "annule";
  const chiffres = x => String(x || "").replace(/\D/g, "");
  // Équivalent du déclencheur SQL : rattache un RDV à une fiche patient (existante ou créée)
  function lierPatient(r) {
    if (r.patient_id) return;
    const lo = x => (x || "").toLowerCase();
    let p = db.patients.find(x => x.cabinet_id === r.cabinet_id && x.nom.toUpperCase() === r.patient_nom.toUpperCase()
      && (!x.prenom || !r.patient_prenom || lo(x.prenom) === lo(r.patient_prenom))
      && ((r.patient_email && lo(x.email) === lo(r.patient_email)) || (r.patient_tel && chiffres(x.telephone) === chiffres(r.patient_tel))
          || (!r.patient_email && !r.patient_tel && lo(x.prenom) === lo(r.patient_prenom))));
    if (!p) {
      const now = new Date().toISOString();
      p = { id: uid(), cabinet_id: r.cabinet_id, nom: r.patient_nom, prenom: r.patient_prenom || null, email: r.patient_email || null,
            telephone: r.patient_tel || null, date_naissance: null, notes: null, created_at: now, updated_at: now };
      db.patients.push(p);
    } else { p.email = p.email || r.patient_email || null; p.telephone = p.telephone || r.patient_tel || null; }
    r.patient_id = p.id;
  }
  const chevauche = (a0, a1, b0, b1) => Date.parse(a0) < Date.parse(b1) && Date.parse(a1) > Date.parse(b0);
  function conflitRdv(r, exclureId) {
    if (!actifs(r)) return false;
    return db.rdv.some(x => x.id !== exclureId && x.praticien_id === r.praticien_id && actifs(x) && chevauche(x.debut, x.fin, r.debut, r.fin));
  }

  // ---------- Emails simulés (même contenu que les emails réels) ----------
  const escH = x => String(x ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  function quandTZ(d) {
    const x = new Date(d);
    const jour = new Intl.DateTimeFormat("fr-FR", { timeZone: TZ, weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(x);
    const heure = new Intl.DateTimeFormat("fr-FR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(x);
    return { jour, heure, texte: `${jour} à ${heure}` };
  }
  function gabarit(r, titre, intro, avecLien, piece) {
    const c = db.cabinets.find(x => x.id === r.cabinet_id), p = db.praticiens.find(x => x.id === r.praticien_id) || {}, s = db.prestations.find(x => x.id === r.prestation_id);
    const q = quandTZ(r.debut);
    const ligne = (k, v) => v ? `<tr><td style="padding:4px 12px 4px 0;color:#64748b">${k}</td><td style="padding:4px 0;font-weight:600">${escH(v)}</td></tr>` : "";
    return `<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#0f172a">
  <div style="max-width:560px;margin:0 auto;padding:24px">
   <div style="background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0">
    <div style="background:${escH(c.couleur)};color:#fff;padding:18px 24px;font-size:18px;font-weight:700">${escH(c.nom)}</div>
    <div style="padding:24px">
     <h1 style="font-size:20px;margin:0 0 12px">${escH(titre)}</h1>
     <p style="margin:0 0 16px;line-height:1.5">${intro}</p>
     <table style="border-collapse:collapse;font-size:15px;margin-bottom:16px">${ligne("Date", q.jour)}${ligne("Heure", q.heure)}${ligne("Séance", s && s.nom)}${ligne("Avec", p.nom)}${ligne("Adresse", c.adresse)}</table>
     ${avecLien ? `<p style="margin:20px 0"><a href="patient.html?rdv=${r.token}" style="background:${escH(c.couleur)};color:#fff;text-decoration:none;padding:12px 18px;border-radius:8px;display:inline-block">Voir ou annuler mon rendez-vous</a></p>
     <p style="font-size:13px;color:#64748b">Annulation en ligne possible jusqu'à ${c.delai_annulation_heures} h avant le rendez-vous.</p>` : ""}
     ${piece ? `<p style="font-size:13px;color:#64748b">📎 Pièce jointe : rendez-vous.ics (ajout à l'agenda du téléphone)</p>` : ""}
     ${c.telephone ? `<p style="font-size:13px;color:#64748b">Une question ? Appelez le cabinet au ${escH(c.telephone)}.</p>` : ""}
    </div>
   </div>
   <p style="font-size:11px;color:#94a3b8;text-align:center;margin-top:12px">Email automatique, merci de ne pas y répondre.</p>
  </div></body></html>`;
  }
  function ajouterEmail(e) {
    db.emails = db.emails || [];
    db.emails.unshift({ id: uid(), date: new Date().toISOString(), lu: false, ...e });
    db.emails = db.emails.slice(0, 60);
  }
  function notifier(type, r) {
    const c = db.cabinets.find(x => x.id === r.cabinet_id), p = db.praticiens.find(x => x.id === r.praticien_id) || {};
    const q = quandTZ(r.debut), patient = `${r.patient_prenom || ""} ${r.patient_nom}`.trim();
    const envoyes = [];
    db.emails = (db.emails || []).map(e => e.rdv_id === r.id && e.type === "rappel" && e.etat === "programmé" ? { ...e, etat: "annulé" } : e);
    const dest = p.email || c.email;
    if (dest && ((type === "confirmation" && r.source === "en_ligne") || (type === "annulation" && r.annule_par === "patient"))) {
      const titre = type === "confirmation" ? "Nouveau rendez-vous en ligne" : "Rendez-vous annulé par le patient";
      const intro = `<strong>${escH(patient)}</strong>${r.patient_tel ? ` – ${escH(r.patient_tel)}` : ""}${r.patient_email ? ` – ${escH(r.patient_email)}` : ""}${r.note ? `<br>Note : ${escH(r.note)}` : ""}`;
      ajouterEmail({ rdv_id: r.id, type: "praticien", a: dest, sujet: `${titre} : ${patient}, ${q.texte}`, html: gabarit(r, titre, intro, false, false), etat: "envoyé" });
      envoyes.push(dest);
    }
    if (r.patient_email) {
      const env = (titre, sujet, intro, lien, piece) => { ajouterEmail({ rdv_id: r.id, type, a: r.patient_email, sujet, html: gabarit(r, titre, intro, lien, piece), etat: "envoyé" }); envoyes.push(r.patient_email); };
      if ((type === "confirmation" || type === "modification") && Date.parse(r.debut) > Date.now()) {
        const veille = wall(addDays(dayOf(r.debut), -1), "18:00");
        ajouterEmail({ rdv_id: r.id, type: "rappel", a: r.patient_email, sujet: `Rappel : rendez-vous ${q.texte}`, etat: "programmé", programme: veille.toISOString(),
          html: gabarit(r, "Rappel de votre rendez-vous", `Bonjour ${escH(patient)}, nous vous rappelons votre rendez-vous.`, true, false) });
      }
      if (type === "confirmation") env("Votre rendez-vous est confirmé", `Rendez-vous confirmé le ${q.texte}`, `Bonjour ${escH(patient)}, nous avons bien enregistré votre rendez-vous.`, true, true);
      if (type === "modification") env("Votre rendez-vous a été modifié", `Rendez-vous modifié : ${q.texte}`, `Bonjour ${escH(patient)}, voici le nouvel horaire de votre rendez-vous.`, true, true);
      if (type === "annulation") env("Votre rendez-vous est annulé", `Rendez-vous annulé (${q.texte})`, `Bonjour ${escH(patient)}, ${r.annule_par === "patient" ? "votre annulation a bien été prise en compte" : "le cabinet a dû annuler votre rendez-vous. Nous vous invitons à en reprendre un"}.`, false, false);
    }
    if (envoyes.length) setTimeout(() => window.RDV_DEMO && window.RDV_DEMO.annoncer(envoyes), 300);
  }

  // ---------- Fonctions publiques (équivalent des RPC Supabase) ----------
  const rpc = {
    get_cabinet_public({ p_slug }) {
      const c = db.cabinets.find(x => x.slug === p_slug && x.actif); if (!c) return null;
      return { id: c.id, slug: c.slug, nom: c.nom, adresse: c.adresse, telephone: c.telephone, email: c.email, site_web: c.site_web,
        message_accueil: c.message_accueil, couleur: c.couleur, fuseau: c.fuseau, horizon_jours: c.horizon_jours, delai_annulation_heures: c.delai_annulation_heures,
        praticiens: db.praticiens.filter(p => p.cabinet_id === c.id && p.actif && db.horaires.some(h => h.praticien_id === p.id)).sort((a, b) => a.ordre - b.ordre)
          .map(p => ({ id: p.id, nom: p.nom, specialite: p.specialite, couleur: p.couleur })),
        prestations: db.prestations.filter(s => s.cabinet_id === c.id && s.actif && s.reservable_en_ligne).sort((a, b) => a.ordre - b.ordre)
          .map(s => ({ id: s.id, nom: s.nom, description: s.description, duree_minutes: s.duree_minutes, prix: s.prix, praticiens: s.praticiens })) };
    },
    get_creneaux({ p_slug, p_prestation, p_du, p_au, p_praticien }) {
      const c = db.cabinets.find(x => x.slug === p_slug && x.actif); if (!c) return [];
      const pr = db.prestations.find(s => s.id === p_prestation && s.cabinet_id === c.id && s.actif); if (!pr) return [];
      const today = todayTZ();
      const du = p_du > today ? p_du : today;
      let au = [p_au, addDays(p_du, 31), addDays(today, c.horizon_jours)].sort()[0];
      const min = Date.now() + c.delai_min_heures * 3600e3, dur = pr.duree_minutes * 60000, pas = c.pas_minutes * 60000;
      const prats = db.praticiens.filter(p => p.cabinet_id === c.id && p.actif && (!p_praticien || p.id === p_praticien) && (!pr.praticiens || pr.praticiens.includes(p.id)));
      const out = [];
      for (let ds = du; ds <= au; ds = addDays(ds, 1)) {
        const dow = isoDow(ds);
        for (const p of prats) for (const h of db.horaires.filter(x => x.praticien_id === p.id && x.jour === dow)) {
          const fin = wall(ds, h.fin).getTime();
          for (let t = wall(ds, h.debut).getTime(); t + dur <= fin; t += pas) {
            if (t < min) continue;
            const a = iso(t), b = iso(t + dur);
            if (db.rdv.some(r => r.praticien_id === p.id && actifs(r) && chevauche(r.debut, r.fin, a, b))) continue;
            if (db.absences.some(x => x.praticien_id === p.id && chevauche(x.debut, x.fin, a, b))) continue;
            out.push({ praticien_id: p.id, debut: a });
          }
        }
      }
      return out.sort((x, y) => x.debut < y.debut ? -1 : x.debut > y.debut ? 1 : x.praticien_id < y.praticien_id ? -1 : 1);
    },
    reserver(a) {
      const c = db.cabinets.find(x => x.slug === a.p_slug && x.actif); if (!c) throw E("Cabinet introuvable.");
      const pr = db.prestations.find(s => s.id === a.p_prestation && s.cabinet_id === c.id && s.actif && s.reservable_en_ligne);
      if (!pr) throw E("Ce type de séance n'est pas réservable en ligne.");
      const nom = (a.p_nom || "").trim(), prenom = (a.p_prenom || "").trim(), email = (a.p_email || "").trim().toLowerCase(), tel = (a.p_tel || "").trim();
      if (nom.length < 2 || prenom.length < 1) throw E("Merci d'indiquer votre nom et votre prénom.");
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw E("Adresse email invalide.");
      if (tel.replace(/\D/g, "").length < 10) throw E("Numéro de téléphone invalide.");
      if (db.rdv.filter(r => r.cabinet_id === c.id && (r.patient_email || "").toLowerCase() === email && r.statut === "confirme" && Date.parse(r.debut) > Date.now()).length >= 3)
        throw E("Vous avez déjà 3 rendez-vous à venir. Contactez le cabinet pour en prendre davantage.");
      const jour = dayOf(a.p_debut), cible = Date.parse(a.p_debut);
      const libres = rpc.get_creneaux({ p_slug: a.p_slug, p_prestation: pr.id, p_du: jour, p_au: jour, p_praticien: a.p_praticien }).filter(s => Date.parse(s.debut) === cible);
      if (!libres.length) throw E("Ce créneau n'est plus disponible, merci d'en choisir un autre.");
      const pid = libres[Math.floor(Math.random() * libres.length)].praticien_id;
      const now = new Date().toISOString();
      const r = { id: uid(), cabinet_id: c.id, praticien_id: pid, prestation_id: pr.id, debut: iso(cible), fin: iso(cible + pr.duree_minutes * 60000),
        patient_nom: nom.toUpperCase(), patient_prenom: prenom.charAt(0).toUpperCase() + prenom.slice(1).toLowerCase(), patient_email: email, patient_tel: tel,
        note: (a.p_note || "").trim() || null, statut: "confirme", source: "en_ligne", annule_par: null, token: uid(), rappel_envoye: false, created_at: now, updated_at: now };
      lierPatient(r); db.rdv.push(r); notifier("confirmation", r); save();
      return { token: r.token, debut: r.debut, fin: r.fin, praticien: db.praticiens.find(p => p.id === pid).nom, prestation: pr.nom };
    },
    consulter_rdv({ p_token }) {
      const r = db.rdv.find(x => x.token === p_token); if (!r) return null;
      const c = db.cabinets.find(x => x.id === r.cabinet_id), p = db.praticiens.find(x => x.id === r.praticien_id), s = db.prestations.find(x => x.id === r.prestation_id);
      return { debut: r.debut, fin: r.fin, statut: r.statut, patient: `${r.patient_prenom || ""} ${r.patient_nom}`.trim(), praticien: p.nom, prestation: s ? s.nom : null,
        cabinet: c.nom, cabinet_slug: c.slug, adresse: c.adresse, telephone: c.telephone, couleur: c.couleur, fuseau: c.fuseau,
        peut_annuler: r.statut === "confirme" && Date.parse(r.debut) > Date.now() + c.delai_annulation_heures * 3600e3, delai_annulation_heures: c.delai_annulation_heures };
    },
    annuler_rdv({ p_token }) {
      const r = db.rdv.find(x => x.token === p_token); if (!r) throw E("Rendez-vous introuvable.");
      const c = db.cabinets.find(x => x.id === r.cabinet_id);
      if (r.statut !== "confirme") throw E("Ce rendez-vous est déjà annulé ou passé.");
      if (Date.parse(r.debut) <= Date.now() + c.delai_annulation_heures * 3600e3)
        throw E(`Annulation en ligne impossible moins de ${c.delai_annulation_heures} h avant le rendez-vous. Merci d'appeler le cabinet au ${c.telephone}.`);
      r.statut = "annule"; r.annule_par = "patient"; r.updated_at = new Date().toISOString(); notifier("annulation", r); save();
      return rpc.consulter_rdv({ p_token });
    },
    lier_mon_compte() {
      const s = session(); if (!s) return 0; let n = 0;
      for (const p of db.praticiens) if (!p.user_id && p.email && p.email.toLowerCase() === s.user.email.toLowerCase()) { p.user_id = s.user.id; n++; }
      if (n) save(); return n;
    },
  };

  // ---------- Requêtes sur les tables (équivalent du client Supabase) ----------
  const isoLike = v => typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v);
  const cmp = (a, b) => { if (isoLike(a) && isoLike(b)) { a = Date.parse(a); b = Date.parse(b); } return a < b ? -1 : a > b ? 1 : 0; };
  const likeRe = p => new RegExp("^" + String(p).replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/%/g, ".*").replace(/_/g, ".") + "$", "i");
  const test = (row, [c, op, v]) => {
    const x = row[c];
    switch (op) {
      case "eq": return String(x) === String(v);
      case "neq": return String(x) !== String(v);
      case "gt": return x != null && cmp(x, v) > 0;
      case "gte": return x != null && cmp(x, v) >= 0;
      case "lt": return x != null && cmp(x, v) < 0;
      case "lte": return x != null && cmp(x, v) <= 0;
      case "in": return v.map(String).includes(String(x));
      case "ilike": return x != null && likeRe(v).test(String(x));
      case "or": return v.some(f => test(row, f));
    }
    return true;
  };
  const DEFAUTS = {
    patients: () => ({ prenom: null, email: null, telephone: null, date_naissance: null, notes: null }),
    rdv: () => ({ patient_id: null, statut: "confirme", source: "en_ligne", annule_par: null, token: uid(), rappel_envoye: false, note: null, prestation_id: null, patient_prenom: null, patient_email: null, patient_tel: null }),
    praticiens: () => ({ user_id: null, specialite: null, email: null, couleur: "#0f766e", est_admin: false, actif: true, ordre: 0 }),
    prestations: () => ({ description: null, prix: null, praticiens: null, reservable_en_ligne: true, actif: true, ordre: 0 }),
    horaires: () => ({}), absences: () => ({ motif: null }), cabinets: () => ({}),
  };

  class Requete {
    constructor(t) { this.t = t; this.f = []; this.o = []; this.op = "select"; this.cols = "*"; this.lim = null; this.one = false; this.count = false; this.head = false; this.ret = false; }
    select(cols = "*", opts = {}) { if (this.op === "select") { this.cols = cols; this.count = !!opts.count; this.head = !!opts.head; } else this.ret = true; return this; }
    insert(p) { this.op = "insert"; this.p = p; return this; }
    update(p) { this.op = "update"; this.p = p; return this; }
    delete() { this.op = "delete"; return this; }
    eq(c, v) { this.f.push([c, "eq", v]); return this; } neq(c, v) { this.f.push([c, "neq", v]); return this; }
    gt(c, v) { this.f.push([c, "gt", v]); return this; } gte(c, v) { this.f.push([c, "gte", v]); return this; }
    lt(c, v) { this.f.push([c, "lt", v]); return this; } lte(c, v) { this.f.push([c, "lte", v]); return this; }
    in(c, v) { this.f.push([c, "in", v]); return this; } ilike(c, v) { this.f.push([c, "ilike", v]); return this; }
    or(s) { this.f.push([null, "or", s.split(",").map(x => { const i = x.indexOf("."), j = x.indexOf(".", i + 1); return [x.slice(0, i), x.slice(i + 1, j), x.slice(j + 1)]; })]); return this; }
    order(c, o = {}) { this.o.push([c, o.ascending === false ? -1 : 1]); return this; }
    limit(n) { this.lim = n; return this; }
    single() { this.one = true; return this; }
    then(ok, ko) { return new Promise(r => setTimeout(r, 60)).then(() => this.run()).then(ok, ko); }
    run() {
      sync();
      const table = db[this.t]; if (!table) return { data: null, error: E("Table inconnue") };
      const match = r => this.f.every(f => test(r, f));
      try {
        if (this.op === "select") {
          let res = table.filter(match);
          if (this.o.length) res.sort((a, b) => { for (const [c, d] of this.o) { const v = cmp(a[c], b[c]); if (v) return v * d; } return 0; });
          const count = res.length;
          if (this.lim != null) res = res.slice(0, this.lim);
          res = clone(res);
          if (this.t === "praticiens" && /cabinets\(/.test(this.cols)) res.forEach(p => p.cabinets = clone(db.cabinets.find(c => c.id === p.cabinet_id)));
          if (this.head) return { data: null, error: null, count };
          if (this.one) return res.length === 1 ? { data: res[0], error: null } : { data: null, error: E("Aucune ligne trouvée") };
          return { data: res, error: null, count: this.count ? count : null };
        }
        if (this.op === "insert") {
          const now = new Date().toISOString();
          const lignes = (Array.isArray(this.p) ? this.p : [this.p]).map(x => ({ id: uid(), created_at: now, updated_at: now, ...DEFAUTS[this.t](), ...clone(x) }));
          if (this.t === "rdv") { for (const r of lignes) if (conflitRdv(r)) return { data: null, error: E("Chevauchement de rendez-vous", "23P01") }; lignes.forEach(lierPatient); }
          table.push(...lignes);
          if (this.t === "rdv") lignes.filter(r => r.statut === "confirme").forEach(r => notifier("confirmation", r));
          save();
          return { data: this.ret ? clone(this.one ? lignes[0] : lignes) : null, error: null };
        }
        if (this.op === "update") {
          const cibles = table.filter(match);
          for (const r of cibles) { const n = { ...r, ...clone(this.p), updated_at: new Date().toISOString() }; if (this.t === "rdv" && conflitRdv(n, r.id)) return { data: null, error: E("Chevauchement", "23P01") }; }
          const avant = this.t === "rdv" ? cibles.map(clone) : [];
          cibles.forEach(r => Object.assign(r, clone(this.p), { updated_at: new Date().toISOString() }));
          if (this.t === "rdv") cibles.forEach((r, i) => {
            const o = avant[i];
            if (r.statut === "annule" && o.statut !== "annule") notifier("annulation", r);
            else if (r.statut === "confirme" && (Date.parse(r.debut) !== Date.parse(o.debut) || r.praticien_id !== o.praticien_id)) notifier("modification", r);
          });
          save();
          if (!this.ret) return { data: null, error: null };
          return this.one ? (cibles.length === 1 ? { data: clone(cibles[0]), error: null } : { data: null, error: E("Aucune ligne trouvée") }) : { data: clone(cibles), error: null };
        }
        if (this.op === "delete") {
          if (this.t === "patients") { const ids = table.filter(match).map(x => x.id); db.rdv.forEach(r => { if (ids.includes(r.patient_id)) r.patient_id = null; }); }
          if (this.t === "prestations") { const ids = table.filter(match).map(s => s.id); db.rdv.forEach(r => { if (ids.includes(r.prestation_id)) r.prestation_id = null; }); }
          db[this.t] = table.filter(r => !match(r)); save(); return { data: null, error: null };
        }
      } catch (e) { return { data: null, error: E(String(e.message || e)) }; }
    }
  }

  // ---------- Authentification simulée ----------
  const ecouteurs = [];
  const session = () => { try { return JSON.parse(store.get(SKEY) || "null"); } catch { return null; } };
  const emettre = (ev, s) => ecouteurs.forEach(f => { try { f(ev, s); } catch (e) { console.error(e); } });
  const auth = {
    getSession: async () => ({ data: { session: session() } }),
    onAuthStateChange: f => { ecouteurs.push(f); return { data: { subscription: { unsubscribe() {} } } }; },
    signInWithPassword: async ({ email, password }) => {
      sync();
      const u = db.users.find(x => x.email === String(email).toLowerCase() && x.password === password);
      if (!u) return { data: {}, error: E("Invalid login credentials") };
      const s = { access_token: "demo", user: { id: u.id, email: u.email } };
      store.set(SKEY, JSON.stringify(s)); emettre("SIGNED_IN", s);
      return { data: { user: s.user, session: s }, error: null };
    },
    signOut: async () => { store.del(SKEY); emettre("SIGNED_OUT", null); return { error: null }; },
    resetPasswordForEmail: async () => ({ data: {}, error: null }),
    updateUser: async () => ({ data: { user: (session() || {}).user }, error: null }),
  };

  window.RDV_CONFIG = { supabaseUrl: "demo", supabaseAnonKey: "demo", cabinet: "demo-kine" };
  window.supabase = {
    createClient: () => ({
      from: t => new Requete(t),
      rpc: async (fn, args) => {
        await new Promise(r => setTimeout(r, 120));
        sync();
        try { return { data: clone(rpc[fn](args || {}) ?? null), error: null }; }
        catch (e) { return { data: null, error: e && e.message ? e : E(String(e)) }; }
      },
      auth,
    }),
  };

  // ---------- Bandeau « démonstration » et boîte mail simulée ----------
  const LIBELLES = { confirmation: "Confirmation", modification: "Modification", annulation: "Annulation", rappel: "Rappel J-1", praticien: "Alerte praticien" };
  const fmtCourt = d => new Intl.DateTimeFormat("fr-FR", { timeZone: TZ, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(d));
  function majCompteur() {
    const n = (db.emails || []).filter(e => !e.lu && e.etat === "envoyé").length;
    const z = document.getElementById("demoMailN");
    if (z) { z.textContent = n; z.style.display = n ? "inline-block" : "none"; }
  }
  function ouvrirBoite(idChoisi) {
    sync();
    document.getElementById("demoMail")?.remove();
    const emails = db.emails || [];
    const v = document.createElement("div");
    v.id = "demoMail";
    v.style.cssText = "position:fixed;inset:0;z-index:100;background:rgba(15,23,42,.5);display:flex;align-items:center;justify-content:center;padding:12px;font:14px/1.4 system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:#0f172a";
    v.innerHTML = `<div style="background:#fff;border-radius:14px;width:min(1000px,100%);height:min(720px,100%);display:flex;flex-direction:column;overflow:hidden">
      <div style="display:flex;align-items:center;gap:10px;padding:12px 16px;border-bottom:1px solid #e2e8f0"><strong style="font-size:16px">📧 Boîte mail de démonstration</strong>
        <span id="dmSous" style="color:#64748b;font-size:12px">Ce que reçoivent patients et praticiens · rien n'est réellement envoyé</span>
        <button type="button" id="dmFermer" style="margin-left:auto;border:1px solid #e2e8f0;background:#fff;border-radius:8px;padding:6px 12px;cursor:pointer">Fermer</button></div>
      <div id="dmCorps" style="flex:1;display:flex;min-height:0">
        <div id="dmListe" style="width:330px;max-width:45%;border-right:1px solid #e2e8f0;overflow:auto"></div>
        <div style="flex:1;min-width:0;display:flex;flex-direction:column"><div id="dmEntete" style="padding:10px 14px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#475569"></div><iframe id="dmVue" title="Aperçu de l'email" style="flex:1;border:0;width:100%;background:#f1f5f9"></iframe></div>
      </div></div>`;
    document.body.append(v);
    const fermer = () => { v.remove(); majCompteur(); };
    v.querySelector("#dmFermer").onclick = fermer;
    v.addEventListener("click", e => { if (e.target === v) fermer(); });
    const liste = v.querySelector("#dmListe"), vue = v.querySelector("#dmVue"), entete = v.querySelector("#dmEntete");
    if (window.innerWidth < 640) { v.querySelector("#dmSous").style.display = "none"; v.querySelector("#dmCorps").style.flexDirection = "column"; liste.style.cssText = "max-height:38%;overflow:auto;border-bottom:1px solid #e2e8f0"; }
    if (!emails.length) {
      liste.innerHTML = `<p style="padding:16px;color:#64748b">Aucun email pour l'instant. Réservez un rendez-vous côté patient, ou créez-en un dans l'agenda avec une adresse email : l'email apparaîtra ici.</p>`;
      vue.srcdoc = ""; return;
    }
    liste.innerHTML = emails.map(e => `<button type="button" data-id="${e.id}" style="display:block;width:100%;text-align:left;border:0;border-bottom:1px solid #f1f5f9;background:#fff;padding:10px 14px;cursor:pointer;font:inherit">
      <span style="display:flex;justify-content:space-between;gap:8px;font-size:12px;color:#64748b"><span style="font-weight:600;color:${e.type === "annulation" ? "#b91c1c" : e.type === "praticien" ? "#b45309" : "#0f766e"}">${LIBELLES[e.type] || e.type}${e.etat !== "envoyé" ? ` · ${e.etat}` : ""}</span><span>${fmtCourt(e.etat === "programmé" ? e.programme : e.date)}</span></span>
      <span style="display:block;font-weight:${e.lu ? 400 : 700};margin-top:2px">${escH(e.sujet)}</span>
      <span style="display:block;font-size:12px;color:#64748b">À : ${escH(e.a)}</span></button>`).join("");
    const montrer = id => {
      const e = emails.find(x => x.id === id) || emails[0];
      liste.querySelectorAll("button").forEach(b => b.style.background = b.dataset.id === e.id ? "#ecfdf5" : "#fff");
      entete.innerHTML = `<strong>${escH(e.sujet)}</strong><br>À : ${escH(e.a)} · ${e.etat === "programmé" ? "envoi programmé le " + fmtCourt(e.programme) : e.etat === "annulé" ? "envoi annulé (rendez-vous modifié ou annulé)" : "envoyé le " + fmtCourt(e.date)}`;
      vue.srcdoc = e.html;
      vue.onload = () => { try { vue.contentDocument.addEventListener("click", ev => { const a = ev.target.closest("a"); if (a) { ev.preventDefault(); location.href = a.getAttribute("href"); } }); } catch {} };
      if (!e.lu) { e.lu = true; const d = db.emails.find(x => x.id === e.id); if (d) d.lu = true; save(); }
    };
    liste.onclick = e => { const b = e.target.closest("button[data-id]"); if (b) montrer(b.dataset.id); };
    montrer(idChoisi);
  }
  window.RDV_DEMO = {
    reset() { store.del(KEY); store.del(SKEY); location.reload(); },
    boite: ouvrirBoite,
    annoncer(dest) {
      majCompteur();
      const t = document.createElement("div");
      t.style.cssText = "position:fixed;left:50%;bottom:calc(70px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:90;background:#10231f;color:#e7f3ef;border-radius:10px;padding:10px 14px;font:14px system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;display:flex;gap:12px;align-items:center;box-shadow:0 6px 20px rgba(0,0,0,.25);max-width:calc(100% - 32px)";
      t.innerHTML = `<span>📧 Email envoyé à ${escH([...new Set(dest)].reverse().join(", "))} <span style="opacity:.7">(simulé)</span></span><button type="button" style="background:#7dd3c0;color:#10231f;border:0;border-radius:7px;padding:5px 10px;cursor:pointer;font-weight:600">Voir</button>`;
      t.querySelector("button").onclick = () => { t.remove(); ouvrirBoite(); };
      document.body.append(t);
      setTimeout(() => t.remove(), 7000);
    },
  };
  document.addEventListener("DOMContentLoaded", () => {
    const page = /praticien/.test(location.pathname) ? "praticien" : "patient";
    const b = document.createElement("div");
    b.setAttribute("role", "note");
    b.style.cssText = "background:#10231f;color:#e7f3ef;font:500 13px/1.35 system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;padding:8px max(16px,env(safe-area-inset-left,0px));display:flex;flex-wrap:wrap;gap:6px 14px;align-items:center";
    const lien = (href, txt, on) => `<a href="${href}" style="color:${on ? "#10231f" : "#e7f3ef"};background:${on ? "#7dd3c0" : "transparent"};border:1px solid #7dd3c0;border-radius:99px;padding:3px 11px;text-decoration:none;white-space:nowrap">${txt}</a>`;
    b.innerHTML = `<strong style="letter-spacing:.06em;text-transform:uppercase;font-size:11px;color:#7dd3c0">Démonstration</strong>
      <span style="opacity:.85">Données fictives, emails simulés</span>
      <button type="button" id="demoMailBtn" style="background:none;border:1px solid #7dd3c0;color:#e7f3ef;border-radius:99px;padding:3px 11px;cursor:pointer;font:inherit;white-space:nowrap">📧 Boîte mail <span id="demoMailN" style="display:none;background:#f59e0b;color:#10231f;border-radius:99px;padding:0 6px;font-size:11px;font-weight:700;margin-left:2px"></span></button>
      <span style="display:flex;gap:6px;flex-wrap:wrap;margin-left:auto">${lien("index.html", "Présentation", false)}${lien("patient.html", "Vue patient", page === "patient")}${lien("praticien.html", "Espace praticien", page === "praticien")}
      <button type="button" id="demoReset" style="background:none;border:0;color:#e7f3ef;text-decoration:underline;cursor:pointer;font:inherit;padding:3px 4px">Réinitialiser</button></span>`;
    document.body.prepend(b);
    b.querySelector("#demoMailBtn").onclick = () => ouvrirBoite();
    majCompteur();
    const r = b.querySelector("#demoReset");
    r.onclick = () => { if (r.dataset.ok) return window.RDV_DEMO.reset(); r.dataset.ok = 1; r.textContent = "Confirmer la réinitialisation"; };
    if (page === "praticien") {
      const f = document.getElementById("fLogin");
      if (f) {
        f.email.value = "claire@kine-lilas.fr"; f.password.value = "demo";
        f.insertAdjacentHTML("beforebegin", `<div class="info" style="margin-bottom:12px">Comptes de démonstration (mot de passe <strong>demo</strong>) :<br>• claire@kine-lilas.fr — administratrice<br>• thomas@kine-lilas.fr — praticien</div>`);
      }
    }
  });
})();
