// =====================================================================
//  RDV Cabinet — MODE DÉMONSTRATION
//  Remplace Supabase par une base simulée dans le navigateur
//  (données fictives, partagées entre la vue patient et l'espace praticien).
// =====================================================================
(function () {
  const KEY = "rdv-demo-v1", SKEY = "rdv-demo-session", TZ = "Europe/Paris";
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
      horaires: [], absences: [], rdv: [],
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
            const [nom, prenom] = (() => { const n = pick(noms).split(" "); return [n.slice(0, -1).join(" "), n[n.length - 1]]; })();
            const passe = t < nowMs;
            const statut = passe ? (rnd() < 0.06 ? "absent" : "honore") : (rnd() < 0.05 ? "annule" : "confirme");
            db.rdv.push({ id: uid(), cabinet_id: C, praticien_id: h.praticien_id, prestation_id: presta, debut: iso(t), fin: iso(t + dur * 60000),
              patient_nom: nom, patient_prenom: prenom, patient_email: `${prenom.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")}.${nom.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s/g, "")}@exemple.fr`,
              patient_tel: `06 ${String(10 + Math.floor(rnd() * 89))} ${String(10 + Math.floor(rnd() * 89))} ${String(10 + Math.floor(rnd() * 89))} ${String(10 + Math.floor(rnd() * 89))}`,
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
  const chevauche = (a0, a1, b0, b1) => Date.parse(a0) < Date.parse(b1) && Date.parse(a1) > Date.parse(b0);
  function conflitRdv(r, exclureId) {
    if (!actifs(r)) return false;
    return db.rdv.some(x => x.id !== exclureId && x.praticien_id === r.praticien_id && actifs(x) && chevauche(x.debut, x.fin, r.debut, r.fin));
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
      db.rdv.push(r); save();
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
      r.statut = "annule"; r.annule_par = "patient"; r.updated_at = new Date().toISOString(); save();
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
    rdv: () => ({ statut: "confirme", source: "en_ligne", annule_par: null, token: uid(), rappel_envoye: false, note: null, prestation_id: null, patient_prenom: null, patient_email: null, patient_tel: null }),
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
          if (this.t === "rdv") for (const r of lignes) if (conflitRdv(r)) return { data: null, error: E("Chevauchement de rendez-vous", "23P01") };
          table.push(...lignes); save();
          return { data: this.ret ? clone(this.one ? lignes[0] : lignes) : null, error: null };
        }
        if (this.op === "update") {
          const cibles = table.filter(match);
          for (const r of cibles) { const n = { ...r, ...clone(this.p), updated_at: new Date().toISOString() }; if (this.t === "rdv" && conflitRdv(n, r.id)) return { data: null, error: E("Chevauchement", "23P01") }; }
          cibles.forEach(r => Object.assign(r, clone(this.p), { updated_at: new Date().toISOString() })); save();
          if (!this.ret) return { data: null, error: null };
          return this.one ? (cibles.length === 1 ? { data: clone(cibles[0]), error: null } : { data: null, error: E("Aucune ligne trouvée") }) : { data: clone(cibles), error: null };
        }
        if (this.op === "delete") {
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

  // ---------- Bandeau « démonstration » ----------
  window.RDV_DEMO = {
    reset() { store.del(KEY); store.del(SKEY); location.reload(); },
  };
  document.addEventListener("DOMContentLoaded", () => {
    const page = /praticien/.test(location.pathname) ? "praticien" : "patient";
    const b = document.createElement("div");
    b.setAttribute("role", "note");
    b.style.cssText = "background:#10231f;color:#e7f3ef;font:500 13px/1.35 system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;padding:8px max(16px,env(safe-area-inset-left,0px));display:flex;flex-wrap:wrap;gap:6px 14px;align-items:center";
    const lien = (href, txt, on) => `<a href="${href}" style="color:${on ? "#10231f" : "#e7f3ef"};background:${on ? "#7dd3c0" : "transparent"};border:1px solid #7dd3c0;border-radius:99px;padding:3px 11px;text-decoration:none;white-space:nowrap">${txt}</a>`;
    b.innerHTML = `<strong style="letter-spacing:.06em;text-transform:uppercase;font-size:11px;color:#7dd3c0">Démonstration</strong>
      <span style="opacity:.85">Données fictives, aucun email envoyé</span>
      <span style="display:flex;gap:6px;flex-wrap:wrap;margin-left:auto">${lien("index.html", "Présentation", false)}${lien("patient.html", "Vue patient", page === "patient")}${lien("praticien.html", "Espace praticien", page === "praticien")}
      <button type="button" id="demoReset" style="background:none;border:0;color:#e7f3ef;text-decoration:underline;cursor:pointer;font:inherit;padding:3px 4px">Réinitialiser</button></span>`;
    document.body.prepend(b);
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
