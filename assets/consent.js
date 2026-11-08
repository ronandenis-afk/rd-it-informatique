/* RD IT Informatique — consentement aux cookies (CNIL)
   Google Analytics n'est chargé qu'après un clic sur « Accepter ».
   Le choix est conservé 6 mois, puis redemandé. GoatCounter (sans cookie) n'est pas concerné. */
(() => {
  const GA_ID = "G-7KD7GFJ4PZ";
  const KEY = "rdit-consent";
  const MAX_AGE = 1000 * 60 * 60 * 24 * 182; // 6 mois

  const read = () => {
    try {
      const v = JSON.parse(localStorage.getItem(KEY) || "null");
      if (v && (v.choice === "granted" || v.choice === "denied") && Date.now() - v.date < MAX_AGE) return v.choice;
    } catch (e) {}
    return null;
  };
  const save = (choice) => {
    try { localStorage.setItem(KEY, JSON.stringify({ choice, date: Date.now() })); } catch (e) {}
  };

  let gaLoaded = false;
  const loadGA = () => {
    if (gaLoaded) return;
    gaLoaded = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { dataLayer.push(arguments); };
    gtag("js", new Date());
    gtag("config", GA_ID);
    const s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + GA_ID;
    document.head.appendChild(s);
  };

  const clearGACookies = () => {
    const host = location.hostname.replace(/^www\./, "");
    document.cookie.split(";").forEach((c) => {
      const name = c.split("=")[0].trim();
      if (/^_ga/.test(name) || name === "_gid") {
        ["", "; domain=" + host, "; domain=." + host].forEach((d) => {
          document.cookie = name + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/" + d;
        });
      }
    });
  };

  const css = `
  .rdit-cookie{position:fixed;left:16px;right:16px;bottom:16px;z-index:9999;max-width:560px;margin:0 auto;
    background:#101a2b;color:#e6eef7;border:1px solid rgba(0,229,255,.38);border-radius:14px;
    box-shadow:0 20px 60px rgba(0,0,0,.5),0 0 24px rgba(0,229,255,.18);padding:18px 20px;
    font:15px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}
  .rdit-cookie h2{margin:0 0 6px;font:600 1.02rem/1.3 "Space Grotesk",system-ui,sans-serif;color:#fff}
  .rdit-cookie p{margin:0 0 14px;color:#9fb0c3;font-size:.92rem}
  .rdit-cookie a{color:#00e5ff}
  .rdit-cookie .rdit-btns{display:flex;gap:10px;flex-wrap:wrap}
  .rdit-cookie button{flex:1 1 140px;min-height:44px;border-radius:10px;font:600 .95rem system-ui,sans-serif;cursor:pointer;
    border:1px solid rgba(0,229,255,.5);background:transparent;color:#e6eef7}
  .rdit-cookie button:hover{background:rgba(0,229,255,.1)}
  .rdit-cookie button:focus-visible{outline:2px solid #00e5ff;outline-offset:2px}`;

  const showBanner = () => {
    if (document.querySelector(".rdit-cookie")) return;
    if (!document.getElementById("rdit-cookie-css")) {
      const st = document.createElement("style");
      st.id = "rdit-cookie-css";
      st.textContent = css;
      document.head.appendChild(st);
    }
    const box = document.createElement("div");
    box.className = "rdit-cookie";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-labelledby", "rdit-cookie-title");
    box.innerHTML =
      '<h2 id="rdit-cookie-title">Cookies de mesure d\'audience</h2>' +
      "<p>Avec votre accord, j'utilise Google Analytics pour savoir comment le site est consulté et l'améliorer. " +
      'Vous pouvez refuser sans aucune conséquence. <a href="politique-confidentialite.html">En savoir plus</a></p>' +
      '<div class="rdit-btns"><button type="button" data-c="denied">Refuser</button>' +
      '<button type="button" data-c="granted">Accepter</button></div>';
    box.addEventListener("click", (e) => {
      const choice = e.target.getAttribute && e.target.getAttribute("data-c");
      if (!choice) return;
      const prev = read();
      save(choice);
      box.remove();
      if (choice === "granted") loadGA();
      else { clearGACookies(); if (prev === "granted" && gaLoaded) location.reload(); }
    });
    document.body.appendChild(box);
  };

  const init = () => {
    const choice = read();
    if (choice === "granted") loadGA();
    else if (choice === null) showBanner();
    else clearGACookies();
    document.addEventListener("click", (e) => {
      const link = e.target.closest && e.target.closest("[data-cookie-settings]");
      if (!link) return;
      e.preventDefault();
      showBanner();
    });
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
