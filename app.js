(() => {
  // ===== Constants =====
  const MODE_KEYS = ["ed", "early", "vbm"];     // canonical names in data
  const MODE_LABEL = { total: "Total", ed: "Election Day", early: "Early Voting", vbm: "Vote by Mail" };
  // URL shorthand: "ev" for early in the hash to stay short
  const URL_MODE = { ed: "ed", early: "ev", vbm: "vbm" };
  const MODE_FROM_URL = { ed: "ed", ev: "early", vbm: "vbm" };
  const SHARE_BOUNDS = { ed: [30, 80], ev: [0, 40], vbm: [0, 60] };

  // Hypothetical candidate names — Senate and Assembly both pre-2027.
  const CAND = {
    sen_d: "Adams (D)",   sen_r: "Bennett (R)",
    asm_d1: "Carter (D)", asm_d2: "Daniels (D)",
    asm_r1: "Edwards (R)", asm_r2: "Foster (R)",
  };

  // ===== State =====
  const state = {
    mode: "total",
    metric: "sen_margin",  // sen_margin | asm_margin | asm_outcome | turnout
    raceFocus: "sen",      // sen | asm
    view: "baseline",
    senSwing: { ed: 0, ev: 0, vbm: 0 },
    asmSwing: { ed: 0, ev: 0, vbm: 0 },
    cwShare:  { ed: 55, ev: 15, vbm: 30 },
    bullet: 8,             // percent, default 8% (typical NJ Assembly bullet rate)
    intraD: 52,            // D1's share of D ticket, %
    intraR: 52,            // R1's share of R ticket, %
    coattail: 0,           // 0..1
    muniSwing: {},         // {muni: {sen:{ed,ev,vbm}, asm:{ed,ev,vbm}}}
  };
  let defaultShare = { ed: 55, ev: 15, vbm: 30 };
  const DEFAULTS = { bullet: 8, intraD: 52, intraR: 52, coattail: 0 };
  let municipalities = [];

  // ===== URL state =====
  function parseUrl() {
    const params = new URLSearchParams(location.hash.slice(1));
    if (params.get("mode")) {
      const m = params.get("mode");
      if (m === "total" || MODE_FROM_URL[m] || MODE_KEYS.includes(m)) {
        state.mode = m === "total" ? "total" : (MODE_FROM_URL[m] || m);
      }
    }
    const metric = params.get("metric");
    if (["sen_margin","asm_margin","asm_outcome","turnout"].includes(metric)) state.metric = metric;
    const race = params.get("race");
    if (race === "sen" || race === "asm") state.raceFocus = race;
    if (params.get("view") === "scenario") state.view = "scenario";
    const parseTriplet = (key, lo, hi) => {
      const v = params.get(key);
      if (!v) return null;
      const parts = v.split(",").map(Number);
      if (parts.length !== 3 || !parts.every(Number.isFinite)) return null;
      return { ed: clamp(parts[0], lo, hi), ev: clamp(parts[1], lo, hi), vbm: clamp(parts[2], lo, hi) };
    };
    const sen = parseTriplet("sen_sw", -15, 15); if (sen) state.senSwing = sen;
    const asm = parseTriplet("asm_sw", -15, 15); if (asm) state.asmSwing = asm;
    const sh  = parseTriplet("sh", 0, 100);      if (sh)  state.cwShare  = sh;
    const b = +params.get("b");  if (Number.isFinite(b)) state.bullet = clamp(b, 0, 30);
    const id = +params.get("id"); if (Number.isFinite(id)) state.intraD = clamp(id, 30, 70);
    const ir = +params.get("ir"); if (Number.isFinite(ir)) state.intraR = clamp(ir, 30, 70);
    const co = +params.get("co"); if (Number.isFinite(co)) state.coattail = clamp(co, 0, 1);
  }
  function parseMuniUrl() {
    const params = new URLSearchParams(location.hash.slice(1));
    const mu = params.get("mu");
    if (!mu) return;
    for (const item of mu.split(";")) {
      if (!item) continue;
      const m = item.match(/^(\d+):(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)$/);
      if (!m) continue;
      const idx = +m[1];
      if (idx < 0 || idx >= municipalities.length) continue;
      const name = municipalities[idx];
      state.muniSwing[name] = {
        sen: { ed: clamp(+m[2],-20,20), ev: clamp(+m[3],-20,20), vbm: clamp(+m[4],-20,20) },
        asm: { ed: clamp(+m[5],-20,20), ev: clamp(+m[6],-20,20), vbm: clamp(+m[7],-20,20) },
      };
    }
  }
  function syncUrl() {
    const p = new URLSearchParams();
    if (state.mode !== "total") p.set("mode", URL_MODE[state.mode] || state.mode);
    if (state.metric !== "sen_margin") p.set("metric", state.metric);
    if (state.raceFocus !== "sen") p.set("race", state.raceFocus);
    if (state.view !== "baseline") p.set("view", state.view);
    const tripletDefault = (t, def) => t.ed === def && t.ev === def && t.vbm === def;
    if (!tripletDefault(state.senSwing, 0)) p.set("sen_sw", [state.senSwing.ed, state.senSwing.ev, state.senSwing.vbm].map(fmtNum).join(","));
    if (!tripletDefault(state.asmSwing, 0)) p.set("asm_sw", [state.asmSwing.ed, state.asmSwing.ev, state.asmSwing.vbm].map(fmtNum).join(","));
    const shDef = approxEq(state.cwShare.ed, defaultShare.ed) && approxEq(state.cwShare.ev, defaultShare.ev) && approxEq(state.cwShare.vbm, defaultShare.vbm);
    if (!shDef) p.set("sh", [state.cwShare.ed, state.cwShare.ev, state.cwShare.vbm].map(fmtNum).join(","));
    if (!approxEq(state.bullet, DEFAULTS.bullet))     p.set("b",  fmtNum(state.bullet));
    if (!approxEq(state.intraD, DEFAULTS.intraD))     p.set("id", fmtNum(state.intraD));
    if (!approxEq(state.intraR, DEFAULTS.intraR))     p.set("ir", fmtNum(state.intraR));
    if (!approxEq(state.coattail, DEFAULTS.coattail)) p.set("co", fmtNum(state.coattail));
    const muParts = [];
    municipalities.forEach((name, idx) => {
      const s = state.muniSwing[name];
      if (!s) return;
      const allZero = ["sen","asm"].every(r => MODE_KEYS.every(k => s[r][k] === 0));
      if (allZero) return;
      muParts.push(`${idx}:${[s.sen.ed,s.sen.ev,s.sen.vbm,s.asm.ed,s.asm.ev,s.asm.vbm].map(fmtNum).join(",")}`);
    });
    if (muParts.length) p.set("mu", muParts.join(";"));
    const h = p.toString();
    history.replaceState(null, "", h ? "#" + h : location.pathname);
  }

  function fmtNum(n) { return Number.isInteger(n) ? String(n) : (Math.round(n * 100) / 100).toString(); }
  function approxEq(a, b) { return Math.abs(a - b) < 0.05; }
  function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }

  // ===== Color logic =====
  function marginColor(pct) {
    const a = clamp(pct, -40, 40) / 40;
    if (a >= 0) {
      const t = a;
      const r = Math.round(255 + (44 - 255) * t);
      const g = Math.round(255 + (126 - 255) * t);
      const b = Math.round(255 + (248 - 255) * t);
      return `rgb(${r},${g},${b})`;
    }
    const t = -a;
    const r = Math.round(255 + (210 - 255) * t);
    const g = Math.round(255 + (63 - 255) * t);
    const b = Math.round(255 + (63 - 255) * t);
    return `rgb(${r},${g},${b})`;
  }
  function turnoutColor(total, maxTotal) {
    const t = Math.min(1, total / Math.max(1, maxTotal));
    const r = Math.round(30 + (240 - 30) * t);
    const g = Math.round(30 + (200 - 30) * t);
    const b = Math.round(40 + (60 - 40) * t);
    return `rgb(${r},${g},${b})`;
  }
  const OUTCOME_COLOR = {
    "2D":     getCssVar("--outcome-2d",     "#2c7ef8"),
    "1D1R-D": getCssVar("--outcome-1d1rd",  "#6fa8f7"),
    "1D1R-R": getCssVar("--outcome-1d1rr",  "#e07a7a"),
    "2R":     getCssVar("--outcome-2r",     "#d23f3f"),
  };
  function getCssVar(name, fallback) {
    try {
      const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
      return v || fallback;
    } catch { return fallback; }
  }

  function fmt(n) { return Math.round(n).toLocaleString("en-US"); }
  function pct(n) { return (n >= 0 ? "+" : "") + n.toFixed(1) + "%"; }
  function signed(n) { return (n >= 0 ? "+" : "") + fmt(n); }
  function signedFloat(v) {
    const r = Math.round(v * 10) / 10;
    return (r >= 0 ? "+" : "") + r.toFixed(1);
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  }

  // ===== Map setup =====
  const map = L.map("map", { preferCanvas: true, zoomControl: true })
    .setView([39.85, -74.75], 10);
  L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
    attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: "abcd",
    maxZoom: 18,
  }).addTo(map);

  let geojson, layer;
  let maxTurnout = 1;
  let computed = new Map();   // feature -> { sen: modesObj, asm: modesObj, base: {sen,asm} }
  parseUrl();

  fetch("data/ld8_precincts.geojson")
    .then(r => r.json())
    .then(fc => {
      geojson = fc;
      const set = new Set();
      for (const f of fc.features) set.add(f.properties.municipality);
      municipalities = Array.from(set).sort((a, b) => a.localeCompare(b));
      municipalities.forEach(name => {
        state.muniSwing[name] = {
          sen: { ed: 0, ev: 0, vbm: 0 },
          asm: { ed: 0, ev: 0, vbm: 0 },
        };
      });

      // Default share = sum-of-mode-totals (Senate) / district total. Senate
      // and Assembly use the same mode mix in our baseline, so either works.
      let ed = 0, ev = 0, vbm = 0, tot = 0;
      for (const f of fc.features) {
        const sm = f.properties.sen27_modes || {};
        ed  += (sm.ed    || {}).total || 0;
        ev  += (sm.early || {}).total || 0;
        vbm += (sm.vbm   || {}).total || 0;
        tot += f.properties.sen27_baseline_total || 0;
      }
      if (tot > 0) {
        defaultShare = {
          ed: +(ed / tot * 100).toFixed(2),
          ev: +(ev / tot * 100).toFixed(2),
          vbm: +(vbm / tot * 100).toFixed(2),
        };
        const s = defaultShare.ed + defaultShare.ev + defaultShare.vbm;
        defaultShare.ed  *= 100 / s;
        defaultShare.ev  *= 100 / s;
        defaultShare.vbm *= 100 / s;
      }
      const params = new URLSearchParams(location.hash.slice(1));
      if (!params.get("sh")) state.cwShare = { ...defaultShare };
      parseMuniUrl();

      document.getElementById("precinct-count").textContent = fc.features.length;
      document.getElementById("muni-count").textContent = municipalities.length;
      buildMuniControls();
      hydrateControlsFromState();

      layer = L.geoJSON(fc, {
        style: styleFor,
        onEachFeature: (feat, lyr) => {
          lyr.on("mouseover", () => { lyr.setStyle({ weight: 2, color: "#fff" }); showHover(feat); });
          lyr.on("mouseout", () => layer.resetStyle(lyr));
        },
      }).addTo(map);
      try { map.fitBounds(layer.getBounds(), { padding: [16, 16] }); } catch {}
      renderModeStats();
      recompute();
    })
    .catch(err => {
      document.getElementById("sen-totals").textContent = "Failed to load data: " + err;
    });

  // ===== Scenario math =====
  // For each precinct, produce per-mode slices for Senate and Assembly,
  // honoring view (baseline vs scenario) and all sliders.
  function modeKeyFromCanonical(m) { return m; } // ed/early/vbm matches data

  function senSwingForMode(muni, modeKey) {
    const cw = modeKey === "early" ? state.senSwing.ev : state.senSwing[modeKey];
    const mu = state.muniSwing[muni]?.sen || { ed: 0, ev: 0, vbm: 0 };
    const mum = modeKey === "early" ? mu.ev : mu[modeKey];
    return cw + mum;
  }
  function asmSwingForMode(muni, modeKey) {
    const cw = modeKey === "early" ? state.asmSwing.ev : state.asmSwing[modeKey];
    const mu = state.muniSwing[muni]?.asm || { ed: 0, ev: 0, vbm: 0 };
    const mum = modeKey === "early" ? mu.ev : mu[modeKey];
    return cw + mum + state.coattail * senSwingForMode(muni, modeKey);
  }
  function shareForMode(modeKey) {
    return (modeKey === "early" ? state.cwShare.ev : state.cwShare[modeKey]) / 100;
  }

  function applySwingShares(d, r, o, total, swingPts) {
    if (total <= 0) return { d: 0, r: 0, o: 0 };
    let ds = d / total, rs = r / total, os = o / total;
    const delta = swingPts / 200;
    ds += delta; rs -= delta;
    if (ds < 0) ds = 0; if (rs < 0) rs = 0; if (os < 0) os = 0;
    const s = ds + rs + os;
    if (s > 0) { ds /= s; rs /= s; os /= s; }
    return { d: ds, r: rs, o: os };
  }

  // Senate per-mode slice
  function senSlice(feat, modeKey /* ed|early|vbm */) {
    const p = feat.properties;
    const base = (p.sen27_modes || {})[modeKey] || { d: 0, r: 0, o: 0, total: 0 };
    if (state.view !== "scenario") {
      return { d: base.d, r: base.r, o: base.o, total: base.total };
    }
    const grand = p.sen27_baseline_total || 0;
    const newTotal = grand * shareForMode(modeKey);
    const sw = senSwingForMode(p.municipality, modeKey);
    const sh = applySwingShares(base.d, base.r, base.o, base.total, sw);
    return { d: sh.d * newTotal, r: sh.r * newTotal, o: sh.o * newTotal, total: newTotal };
  }
  function senTotalSlice(feat) {
    const ed = senSlice(feat, "ed"), ev = senSlice(feat, "early"), vbm = senSlice(feat, "vbm");
    return { d: ed.d + ev.d + vbm.d, r: ed.r + ev.r + vbm.r, o: ed.o + ev.o + vbm.o,
             total: ed.total + ev.total + vbm.total, by: { ed, early: ev, vbm } };
  }

  // Assembly per-mode slice. Returns candidate-vote counts.
  // Internally: voters_asm * (2 - bullet) = candidate-vote pool, allocated
  // by ticket shares, then split by intra-party slider.
  function asmSlice(feat, modeKey) {
    const p = feat.properties;
    const baseMode = (p.assem27_modes || {})[modeKey] || { d: 0, r: 0, o: 0, total: 0 };
    const voters = state.view === "scenario"
      ? (p.assem27_baseline_total || 0) * shareForMode(modeKey)
      : baseMode.total;
    let dShare, rShare, oShare;
    if (baseMode.total > 0) {
      dShare = baseMode.d / baseMode.total;
      rShare = baseMode.r / baseMode.total;
      oShare = baseMode.o / baseMode.total;
    } else {
      dShare = rShare = oShare = 0;
    }
    if (state.view === "scenario") {
      const sh = applySwingShares(baseMode.d, baseMode.r, baseMode.o, baseMode.total,
                                  asmSwingForMode(p.municipality, modeKey));
      dShare = sh.d; rShare = sh.r; oShare = sh.o;
    }
    const bullet = (state.view === "scenario" ? state.bullet : DEFAULTS.bullet) / 100;
    const votesPerVoter = 2 - bullet;
    const candVotes = voters * votesPerVoter;
    const intraD = (state.view === "scenario" ? state.intraD : DEFAULTS.intraD) / 100;
    const intraR = (state.view === "scenario" ? state.intraR : DEFAULTS.intraR) / 100;
    const dCand = dShare * candVotes;
    const rCand = rShare * candVotes;
    const oCand = oShare * candVotes;
    return {
      d1: dCand * intraD, d2: dCand * (1 - intraD),
      r1: rCand * intraR, r2: rCand * (1 - intraR),
      o: oCand,
      d_total: dCand, r_total: rCand,
      total: candVotes, voters,
      d_share: dShare, r_share: rShare, o_share: oShare,
    };
  }
  function asmTotalSlice(feat) {
    const ed = asmSlice(feat, "ed"), ev = asmSlice(feat, "early"), vbm = asmSlice(feat, "vbm");
    const agg = (k) => ed[k] + ev[k] + vbm[k];
    const total = agg("total");
    return {
      d1: agg("d1"), d2: agg("d2"),
      r1: agg("r1"), r2: agg("r2"),
      o: agg("o"),
      d_total: agg("d_total"), r_total: agg("r_total"),
      total,
      voters: agg("voters"),
      by: { ed, early: ev, vbm },
    };
  }

  // Asm outcome: which two finishers win.
  function asmOutcome(slice) {
    const cands = [
      { name: "d1", v: slice.d1, party: "D" },
      { name: "d2", v: slice.d2, party: "D" },
      { name: "r1", v: slice.r1, party: "R" },
      { name: "r2", v: slice.r2, party: "R" },
      { name: "o",  v: slice.o,  party: "O" },
    ];
    cands.sort((a, b) => b.v - a.v);
    const top2 = cands.slice(0, 2);
    const ds = top2.filter(c => c.party === "D").length;
    const rs = top2.filter(c => c.party === "R").length;
    if (ds === 2) return { code: "2D", top2 };
    if (rs === 2) return { code: "2R", top2 };
    // 1D1R: which finished first?
    return { code: top2[0].party === "D" ? "1D1R-D" : "1D1R-R", top2 };
  }

  function rebuildComputed() {
    computed = new Map();
    let mTurnout = 0;
    for (const f of geojson.features) {
      const sen = senTotalSlice(f);
      const asm = asmTotalSlice(f);
      // Baseline (for deltas) — temporarily flip view
      let baseSen, baseAsm;
      if (state.view === "scenario") {
        const orig = state.view;
        state.view = "baseline";
        baseSen = senTotalSlice(f);
        baseAsm = asmTotalSlice(f);
        state.view = orig;
      }
      const c = { sen, asm, baseSen, baseAsm };
      computed.set(f, c);
      // Color by metric needs to know the active mode's turnout for the
      // turnout ramp.
      const focus = state.metric === "turnout"
        ? activeSenSlice(f, c).total + activeAsmSlice(f, c).voters * 0 // sen-mode total is the turnout proxy
        : 0;
      mTurnout = Math.max(mTurnout, activeSenSlice(f, c).total);
    }
    maxTurnout = mTurnout;
  }

  function activeSenSlice(feat, c) {
    c = c || computed.get(feat);
    if (!c) return { d: 0, r: 0, o: 0, total: 0 };
    if (state.mode === "total") return c.sen;
    return c.sen.by[state.mode];
  }
  function activeAsmSlice(feat, c) {
    c = c || computed.get(feat);
    if (!c) return { d1:0,d2:0,r1:0,r2:0,o:0,d_total:0,r_total:0,total:0,voters:0 };
    if (state.mode === "total") return c.asm;
    return c.asm.by[state.mode];
  }

  function marginPct(slice) {
    if (!slice.total) return 0;
    return (slice.d - slice.r) / slice.total * 100;
  }
  function asmTicketMarginPct(slice) {
    if (!slice.total) return 0;
    return ((slice.d_total - slice.r_total) / slice.total) * 100;
  }

  function styleFor(feat) {
    const c = computed.get(feat);
    if (!c) return { color: "#1a1f27", weight: 0.4, fillColor: "#444", fillOpacity: 0.5 };
    let fill;
    const senS = activeSenSlice(feat, c);
    const asmS = activeAsmSlice(feat, c);
    if (state.metric === "sen_margin") {
      fill = marginColor(marginPct(senS));
    } else if (state.metric === "asm_margin") {
      fill = marginColor(asmTicketMarginPct(asmS));
    } else if (state.metric === "asm_outcome") {
      fill = OUTCOME_COLOR[asmOutcome(asmS).code];
    } else { // turnout
      fill = turnoutColor(senS.total, maxTurnout);
    }
    return { color: "#1a1f27", weight: 0.4, fillColor: fill, fillOpacity: 0.85 };
  }

  // ===== Provenance =====
  function baseSource(feat, race) {
    if (state.mode === "total") {
      const bs = feat.properties.baseline_source || {};
      return bs[race] || "modeled";
    }
    const ms = (feat.properties.mode_source || {})[race] || {};
    return ms[state.mode] || "modeled";
  }
  function precinctSourceClass(feat, race) {
    if (state.view === "scenario") return "scenario";
    return baseSource(feat, race);
  }
  function precinctSourceText(feat, race) {
    const base = baseSource(feat, race);
    return state.view === "scenario" ? `scenario (based on ${base})` : base;
  }

  // ===== Render =====
  function recompute() {
    document.body.classList.toggle("scenario-on", state.view === "scenario");
    document.body.classList.toggle("race-focus-sen", state.raceFocus === "sen");
    document.body.classList.toggle("race-focus-asm", state.raceFocus === "asm");
    rebuildComputed();
    if (layer) layer.setStyle(styleFor);
    renderTotals();
    renderLegend();
    updateModeStatTagsForScenario();
    syncUrl();
  }

  function renderTotals() {
    let senH = { d: 0, r: 0, o: 0, total: 0 };
    let senB = { d: 0, r: 0, o: 0, total: 0 };
    let asmH = { d1:0, d2:0, r1:0, r2:0, o:0, d_total:0, r_total:0, total:0, voters:0 };
    let asmB = { d1:0, d2:0, r1:0, r2:0, o:0, d_total:0, r_total:0, total:0, voters:0 };
    let senFlips = [];   // precincts where Senate winner changes vs baseline
    let asmChanges = []; // precincts where Assembly outcome code changes
    let prec = 0;
    let realSen = 0, realAsm = 0;

    for (const f of geojson.features) {
      prec++;
      const c = computed.get(f);
      const sS = activeSenSlice(f, c);
      const aS = activeAsmSlice(f, c);
      senH.d += sS.d; senH.r += sS.r; senH.o += sS.o; senH.total += sS.total;
      asmH.d1 += aS.d1; asmH.d2 += aS.d2; asmH.r1 += aS.r1; asmH.r2 += aS.r2;
      asmH.o += aS.o;   asmH.d_total += aS.d_total; asmH.r_total += aS.r_total;
      asmH.total += aS.total; asmH.voters += aS.voters;
      // Baseline pieces for delta + flip detection
      if (state.view === "scenario") {
        const sB = state.mode === "total" ? c.baseSen : c.baseSen.by[state.mode];
        const aB = state.mode === "total" ? c.baseAsm : c.baseAsm.by[state.mode];
        senB.d += sB.d; senB.r += sB.r; senB.o += sB.o; senB.total += sB.total;
        asmB.d1 += aB.d1; asmB.d2 += aB.d2; asmB.r1 += aB.r1; asmB.r2 += aB.r2;
        asmB.o += aB.o;   asmB.d_total += aB.d_total; asmB.r_total += aB.r_total;
        asmB.total += aB.total; asmB.voters += aB.voters;
        // Flip detection on TOTAL mode (overall outcome)
        const senSTotal = c.sen, senBTotal = c.baseSen;
        const baseMarg = (senBTotal.d - senBTotal.r);
        const scenMarg = (senSTotal.d - senSTotal.r);
        if (Math.sign(baseMarg) !== Math.sign(scenMarg) && Math.sign(scenMarg) !== 0) {
          senFlips.push({ feat: f, to: scenMarg > 0 ? "D" : "R" });
        }
        const oB = asmOutcome(c.baseAsm).code;
        const oS = asmOutcome(c.asm).code;
        if (oB !== oS) asmChanges.push({ feat: f, from: oB, to: oS });
      }
      // Provenance
      const senSrc = baseSource(f, "sen");
      if (senSrc === "real") realSen++;
      const asmSrc = baseSource(f, "asm");
      if (asmSrc === "real") realAsm++;
    }

    // --- Senate render ---
    const senTotSafe = Math.max(1, senH.total);
    const dp = senH.d / senTotSafe * 100, rp = senH.r / senTotSafe * 100, op = senH.o / senTotSafe * 100;
    const senMarg = dp - rp;
    const senWinner = senH.d > senH.r ? "d" : (senH.r > senH.d ? "r" : null);
    document.getElementById("sen-totals").innerHTML = `
      <div class="d-row name">${escapeHtml(CAND.sen_d)}${senWinner==="d"?'<span class="winner-mark">WIN</span>':""}</div><div>${fmt(senH.d)}</div><div class="pct">${dp.toFixed(1)}%</div>
      <div class="r-row name">${escapeHtml(CAND.sen_r)}${senWinner==="r"?'<span class="winner-mark">WIN</span>':""}</div><div>${fmt(senH.r)}</div><div class="pct">${rp.toFixed(1)}%</div>
      <div class="o-row name">Other</div><div>${fmt(senH.o)}</div><div class="pct">${op.toFixed(1)}%</div>
      <div class="name">Total</div><div>${fmt(senH.total)}</div><div class="pct">${pct(senMarg)}</div>
    `;
    const senBar = document.getElementById("sen-totals-bar");
    senBar.querySelector(".d").style.width = dp + "%";
    senBar.querySelector(".r").style.width = rp + "%";
    senBar.querySelector(".o").style.width = op + "%";
    document.getElementById("sen-totals-meta").textContent =
      `${MODE_LABEL[state.mode]} · ${provenanceText("sen", realSen, prec)}`;

    // --- Senate scenario deltas ---
    const senScen = document.getElementById("sen-totals-scenario");
    if (state.view !== "scenario") {
      senScen.classList.add("hidden"); senScen.innerHTML = "";
    } else {
      senScen.classList.remove("hidden");
      const dD = senH.d - senB.d, dR = senH.r - senB.r, dO = senH.o - senB.o;
      const baseMarg = senB.total ? (senB.d - senB.r) / senB.total * 100 : 0;
      const dMarg = senMarg - baseMarg;
      const flipsD = senFlips.filter(x => x.to === "D");
      const flipsR = senFlips.filter(x => x.to === "R");
      senScen.innerHTML = `
        <div class="delta-row"><span class="lbl">vs baseline:</span><span></span></div>
        <div class="delta-row"><span class="lbl">${escapeHtml(CAND.sen_d)}</span><span class="${dD>=0?'delta-pos':'delta-neg'}">${signed(dD)}</span></div>
        <div class="delta-row"><span class="lbl">${escapeHtml(CAND.sen_r)}</span><span class="${dR>=0?'delta-pos':'delta-neg'}">${signed(dR)}</span></div>
        <div class="delta-row"><span class="lbl">Other</span><span class="${dO>=0?'delta-pos':'delta-neg'}">${signed(dO)}</span></div>
        <div class="delta-row"><span class="lbl">Margin</span><span class="${dMarg>=0?'delta-pos':'delta-neg'}">${pct(dMarg)}</span></div>
        <div class="delta-row" style="margin-top:6px;"><span class="lbl">Precincts flipped</span><span>${senFlips.length}</span></div>
        ${flipsD.length ? `<div class="delta-row"><span class="lbl">&nbsp;&nbsp;R&rarr;D</span><span class="flip-d">${flipsD.length}</span></div>` : ""}
        ${flipsR.length ? `<div class="delta-row"><span class="lbl">&nbsp;&nbsp;D&rarr;R</span><span class="flip-r">${flipsR.length}</span></div>` : ""}
        ${senFlips.length ? `<div class="flip-list">${
          flipsD.map(f => `<div class="flip-d">R&rarr;D · ${escapeHtml(f.feat.properties.precinct)}</div>`).join("") +
          flipsR.map(f => `<div class="flip-r">D&rarr;R · ${escapeHtml(f.feat.properties.precinct)}</div>`).join("")
        }</div>` : ""}
      `;
    }

    // --- Assembly render ---
    const asmTotSafe = Math.max(1, asmH.total);
    const p1 = asmH.d1 / asmTotSafe * 100;
    const p2 = asmH.d2 / asmTotSafe * 100;
    const p3 = asmH.r1 / asmTotSafe * 100;
    const p4 = asmH.r2 / asmTotSafe * 100;
    const pOA = asmH.o / asmTotSafe * 100;
    const ticketMarg = asmTotSafe ? ((asmH.d_total - asmH.r_total) / asmTotSafe * 100) : 0;
    const outcome = asmOutcome(asmH);
    const winnerNames = outcome.top2.map(c => candDisplayName(c.name)).join(", ");
    const winSet = new Set(outcome.top2.map(c => c.name));
    const mark = k => winSet.has(k) ? '<span class="winner-mark">WIN</span>' : "";
    document.getElementById("asm-totals").innerHTML = `
      <div class="d-row name">${escapeHtml(CAND.asm_d1)}${mark("d1")}</div><div>${fmt(asmH.d1)}</div><div class="pct">${p1.toFixed(1)}%</div>
      <div class="d-row name">${escapeHtml(CAND.asm_d2)}${mark("d2")}</div><div>${fmt(asmH.d2)}</div><div class="pct">${p2.toFixed(1)}%</div>
      <div class="r-row name">${escapeHtml(CAND.asm_r1)}${mark("r1")}</div><div>${fmt(asmH.r1)}</div><div class="pct">${p3.toFixed(1)}%</div>
      <div class="r-row name">${escapeHtml(CAND.asm_r2)}${mark("r2")}</div><div>${fmt(asmH.r2)}</div><div class="pct">${p4.toFixed(1)}%</div>
      <div class="o-row name">Other</div><div>${fmt(asmH.o)}</div><div class="pct">${pOA.toFixed(1)}%</div>
      <div class="name">Candidate-votes</div><div>${fmt(asmH.total)}</div><div class="pct">${pct(ticketMarg)}</div>
    `;
    document.getElementById("asm-winners").innerHTML =
      `<span class="label">Winners:</span> ${escapeHtml(winnerNames)}` +
      `<span class="ticket-margin">Ticket ${pct(ticketMarg)} · ~${fmt(asmH.voters)} voters · ${MODE_LABEL[state.mode]}</span>`;
    document.getElementById("asm-totals-meta").textContent =
      `${MODE_LABEL[state.mode]} · ${provenanceText("asm", realAsm, prec)}`;

    // --- Assembly scenario deltas ---
    const asmScen = document.getElementById("asm-totals-scenario");
    if (state.view !== "scenario") {
      asmScen.classList.add("hidden"); asmScen.innerHTML = "";
    } else {
      asmScen.classList.remove("hidden");
      const d1d = asmH.d1 - asmB.d1, d2d = asmH.d2 - asmB.d2,
            r1d = asmH.r1 - asmB.r1, r2d = asmH.r2 - asmB.r2,
            oAd = asmH.o  - asmB.o;
      const baseMarg = asmB.total ? (asmB.d_total - asmB.r_total) / asmB.total * 100 : 0;
      const dMarg = ticketMarg - baseMarg;
      const cntByDelta = { D: 0, R: 0, lostD: 0, gainedD: 0, lostR: 0, gainedR: 0 };
      const changeDirs = asmChanges.map(x => `${x.from}→${x.to}`);
      asmScen.innerHTML = `
        <div class="delta-row"><span class="lbl">vs baseline:</span><span></span></div>
        <div class="delta-row"><span class="lbl">${escapeHtml(CAND.asm_d1)}</span><span class="${d1d>=0?'delta-pos':'delta-neg'}">${signed(d1d)}</span></div>
        <div class="delta-row"><span class="lbl">${escapeHtml(CAND.asm_d2)}</span><span class="${d2d>=0?'delta-pos':'delta-neg'}">${signed(d2d)}</span></div>
        <div class="delta-row"><span class="lbl">${escapeHtml(CAND.asm_r1)}</span><span class="${r1d>=0?'delta-pos':'delta-neg'}">${signed(r1d)}</span></div>
        <div class="delta-row"><span class="lbl">${escapeHtml(CAND.asm_r2)}</span><span class="${r2d>=0?'delta-pos':'delta-neg'}">${signed(r2d)}</span></div>
        <div class="delta-row"><span class="lbl">Other</span><span class="${oAd>=0?'delta-pos':'delta-neg'}">${signed(oAd)}</span></div>
        <div class="delta-row"><span class="lbl">Ticket margin</span><span class="${dMarg>=0?'delta-pos':'delta-neg'}">${pct(dMarg)}</span></div>
        <div class="delta-row" style="margin-top:6px;"><span class="lbl">Outcome changes</span><span>${asmChanges.length}</span></div>
        ${asmChanges.length ? `<div class="flip-list">${
          asmChanges.map(x => `<div class="change">${escapeHtml(x.from)}&nbsp;&rarr;&nbsp;${escapeHtml(x.to)} · ${escapeHtml(x.feat.properties.precinct)}</div>`).join("")
        }</div>` : ""}
      `;
    }
  }

  function candDisplayName(k) {
    return { d1: CAND.asm_d1, d2: CAND.asm_d2, r1: CAND.asm_r1, r2: CAND.asm_r2, o: "Other" }[k];
  }
  function provenanceText(race, realCount, prec) {
    const base = state.mode === "total"
      ? (realCount === prec ? "real" : realCount === 0 ? "modeled" : `${realCount}/${prec} real`)
      : (realCount === prec ? "real" : realCount === 0 ? "modeled" : `${realCount}/${prec} real`);
    return state.view === "scenario" ? `scenario (based on ${base})` : base;
  }

  function renderLegend() {
    const el = document.getElementById("legend");
    if (state.metric === "sen_margin" || state.metric === "asm_margin") {
      const lbl = state.metric === "sen_margin" ? "Senate margin" : "Assembly ticket margin";
      el.innerHTML = `
        <span>R+40</span>
        <span class="swatch" style="background:linear-gradient(to right,
          ${marginColor(-40)},${marginColor(-20)},${marginColor(0)},${marginColor(20)},${marginColor(40)});width:160px;"></span>
        <span>D+40</span>
        <span style="margin-left:8px;">${lbl}</span>
      `;
    } else if (state.metric === "asm_outcome") {
      el.innerHTML = `
        <span class="legend-cat"><span class="swatch" style="background:${OUTCOME_COLOR["2D"]}"></span>2D</span>
        <span class="legend-cat"><span class="swatch" style="background:${OUTCOME_COLOR["1D1R-D"]}"></span>1D1R&nbsp;(D&#8209;led)</span>
        <span class="legend-cat"><span class="swatch" style="background:${OUTCOME_COLOR["1D1R-R"]}"></span>1D1R&nbsp;(R&#8209;led)</span>
        <span class="legend-cat"><span class="swatch" style="background:${OUTCOME_COLOR["2R"]}"></span>2R</span>
      `;
    } else {
      el.innerHTML = `
        <span>0</span>
        <span class="swatch" style="background:linear-gradient(to right,
          ${turnoutColor(0,1)},${turnoutColor(0.5,1)},${turnoutColor(1,1)});width:160px;"></span>
        <span>${fmt(Math.round(maxTurnout))}</span>
        <span style="margin-left:8px;">Senate turnout (${MODE_LABEL[state.mode]})</span>
      `;
    }
  }

  function showHover(feat) {
    const p = feat.properties;
    const c = computed.get(feat);
    if (!c) return;
    const senS = activeSenSlice(feat, c);
    const asmS = activeAsmSlice(feat, c);
    const senSrcCls = precinctSourceClass(feat, "sen");
    const asmSrcCls = precinctSourceClass(feat, "asm");
    const senSrc = precinctSourceText(feat, "sen");
    const asmSrc = precinctSourceText(feat, "asm");
    const senMarg = marginPct(senS);
    const dpSen = senS.total ? senS.d/senS.total*100 : 0;
    const rpSen = senS.total ? senS.r/senS.total*100 : 0;
    const opSen = senS.total ? senS.o/senS.total*100 : 0;
    const ticketMarg = asmTicketMarginPct(asmS);
    const asmTotSafe = Math.max(1, asmS.total);
    const outcome = asmOutcome(asmS);
    const winSet = new Set(outcome.top2.map(c => c.name));
    const wMark = k => winSet.has(k) ? '<span class="winner-mark">WIN</span>' : "";
    const focusFirst = state.raceFocus;

    // Senate block
    const senVsBase = state.view === "scenario" ? (() => {
      const bs = state.mode === "total" ? c.baseSen : c.baseSen.by[state.mode];
      const dD = senS.d - bs.d, dR = senS.r - bs.r;
      const dM = senMarg - (bs.total ? (bs.d - bs.r)/bs.total*100 : 0);
      return `<div class="vs-cert">
        <div class="row"><span class="lbl">vs baseline ${escapeHtml(CAND.sen_d)}</span><span class="${dD>=0?'delta-pos':'delta-neg'}">${signed(dD)}</span></div>
        <div class="row"><span class="lbl">vs baseline ${escapeHtml(CAND.sen_r)}</span><span class="${dR>=0?'delta-pos':'delta-neg'}">${signed(dR)}</span></div>
        <div class="row"><span class="lbl">vs baseline margin</span><span>${pct(dM)}</span></div>
      </div>`;
    })() : "";
    const senBlock = `
      <div class="hover-race">
        <div class="hover-race-title"><span>State Senate</span><em class="tag ${senSrcCls}">${escapeHtml(senSrc)}</em></div>
        <div class="row"><span class="lbl">${escapeHtml(CAND.sen_d)}</span><span>${fmt(senS.d)} · ${dpSen.toFixed(1)}%</span></div>
        <div class="row"><span class="lbl">${escapeHtml(CAND.sen_r)}</span><span>${fmt(senS.r)} · ${rpSen.toFixed(1)}%</span></div>
        <div class="row"><span class="lbl">Other</span><span>${fmt(senS.o)} · ${opSen.toFixed(1)}%</span></div>
        <div class="row"><span class="lbl">Total / Margin</span><span>${fmt(senS.total)} · <span style="color:${senMarg>=0?'var(--dem)':'var(--rep)'}">${pct(senMarg)}</span></span></div>
        ${senVsBase}
      </div>
    `;

    // Assembly block
    const asmVsBase = state.view === "scenario" ? (() => {
      const ba = state.mode === "total" ? c.baseAsm : c.baseAsm.by[state.mode];
      const d1d = asmS.d1 - ba.d1, d2d = asmS.d2 - ba.d2,
            r1d = asmS.r1 - ba.r1, r2d = asmS.r2 - ba.r2;
      const baseM = ba.total ? (ba.d_total - ba.r_total)/ba.total*100 : 0;
      const dM = ticketMarg - baseM;
      const baseO = asmOutcome(ba).code;
      const scenO = outcome.code;
      const outcomeLine = baseO === scenO
        ? `<div class="row"><span class="lbl">Outcome</span><span>${escapeHtml(scenO)} (no change)</span></div>`
        : `<div class="row"><span class="lbl">Outcome</span><span class="change">${escapeHtml(baseO)} &rarr; ${escapeHtml(scenO)}</span></div>`;
      return `<div class="vs-cert">
        <div class="row"><span class="lbl">vs baseline ${escapeHtml(CAND.asm_d1)}</span><span class="${d1d>=0?'delta-pos':'delta-neg'}">${signed(d1d)}</span></div>
        <div class="row"><span class="lbl">vs baseline ${escapeHtml(CAND.asm_d2)}</span><span class="${d2d>=0?'delta-pos':'delta-neg'}">${signed(d2d)}</span></div>
        <div class="row"><span class="lbl">vs baseline ${escapeHtml(CAND.asm_r1)}</span><span class="${r1d>=0?'delta-pos':'delta-neg'}">${signed(r1d)}</span></div>
        <div class="row"><span class="lbl">vs baseline ${escapeHtml(CAND.asm_r2)}</span><span class="${r2d>=0?'delta-pos':'delta-neg'}">${signed(r2d)}</span></div>
        <div class="row"><span class="lbl">vs baseline ticket margin</span><span>${pct(dM)}</span></div>
        ${outcomeLine}
      </div>`;
    })() : "";
    const asmBlock = `
      <div class="hover-race">
        <div class="hover-race-title"><span>General Assembly (vote-for-2) · ${escapeHtml(outcome.code)}</span><em class="tag ${asmSrcCls}">${escapeHtml(asmSrc)}</em></div>
        <div class="row"><span class="lbl">${escapeHtml(CAND.asm_d1)}${wMark("d1")}</span><span>${fmt(asmS.d1)} · ${(asmS.d1/asmTotSafe*100).toFixed(1)}%</span></div>
        <div class="row"><span class="lbl">${escapeHtml(CAND.asm_d2)}${wMark("d2")}</span><span>${fmt(asmS.d2)} · ${(asmS.d2/asmTotSafe*100).toFixed(1)}%</span></div>
        <div class="row"><span class="lbl">${escapeHtml(CAND.asm_r1)}${wMark("r1")}</span><span>${fmt(asmS.r1)} · ${(asmS.r1/asmTotSafe*100).toFixed(1)}%</span></div>
        <div class="row"><span class="lbl">${escapeHtml(CAND.asm_r2)}${wMark("r2")}</span><span>${fmt(asmS.r2)} · ${(asmS.r2/asmTotSafe*100).toFixed(1)}%</span></div>
        <div class="row"><span class="lbl">Other</span><span>${fmt(asmS.o)} · ${(asmS.o/asmTotSafe*100).toFixed(1)}%</span></div>
        <div class="row"><span class="lbl">Ticket margin</span><span style="color:${ticketMarg>=0?'var(--dem)':'var(--rep)'}">${pct(ticketMarg)}</span></div>
        <div class="row"><span class="lbl">Candidate votes / voters</span><span>${fmt(asmS.total)} / ${fmt(asmS.voters)}</span></div>
        ${asmVsBase}
      </div>
    `;

    document.getElementById("hover").innerHTML = `
      <h3>${escapeHtml(p.precinct)}</h3>
      <p class="subline">${escapeHtml(p.municipality)} · ${escapeHtml(p.county)} County · ${MODE_LABEL[state.mode]}</p>
      ${focusFirst === "sen" ? senBlock + asmBlock : asmBlock + senBlock}
    `;
  }

  // ===== Mode-stat tags (per race we count "real" across all features,
  // but display Senate count since the spec keeps a single per-mode tag) =====
  function renderModeStats() {
    const n = geojson.features.length;
    const totalTag = document.querySelector('[data-mode-stat="total"]');
    if (totalTag) {
      let r = 0;
      for (const f of geojson.features) {
        const bs = f.properties.baseline_source || {};
        if (bs.sen === "real" && bs.asm === "real") r++;
      }
      tagSet(totalTag, r, n);
    }
    for (const k of MODE_KEYS) {
      const tag = document.querySelector(`[data-mode-stat="${k}"]`);
      if (!tag) continue;
      let r = 0;
      for (const f of geojson.features) {
        const ms = f.properties.mode_source || {};
        const sen = (ms.sen || {})[k] === "real";
        const asm = (ms.asm || {})[k] === "real";
        if (sen && asm) r++;
      }
      tagSet(tag, r, n);
    }
  }
  function tagSet(tag, r, n) {
    if (r === n)      { tag.textContent = "real";    tag.className = "tag real"; }
    else if (r === 0) { tag.textContent = "modeled"; tag.className = "tag modeled"; }
    else              { tag.textContent = `${Math.round(r/n*100)}% real`; tag.className = "tag partial"; }
  }
  function updateModeStatTagsForScenario() {
    if (state.view !== "scenario") { renderModeStats(); return; }
    document.querySelectorAll("[data-mode-stat]").forEach(tag => {
      const k = tag.getAttribute("data-mode-stat");
      let title = "scenario";
      tag.textContent = "scenario";
      tag.className = "tag scenario";
      tag.title = title;
    });
  }

  // ===== Controls =====
  function buildMuniControls() {
    const list = document.getElementById("muni-list");
    list.innerHTML = "";
    const counts = {};
    for (const f of geojson.features) {
      const n = f.properties.municipality;
      counts[n] = (counts[n] || 0) + 1;
    }
    municipalities.forEach((name) => {
      const sw = state.muniSwing[name];
      const block = document.createElement("div");
      block.className = "muni-block";
      block.dataset.muni = name;
      block.innerHTML = `
        <div class="muni-name"><span>${escapeHtml(name)}</span><span class="count">${counts[name]} prec.</span></div>
        <div class="race-section">
          <div class="race-label">Senate swing</div>
          <div class="slider-row"><label>ED</label><input type="range" min="-20" max="20" step="0.5" value="${sw.sen.ed}" data-race="sen" data-mode-k="ed" /><span class="slider-val">${signedFloat(sw.sen.ed)}</span></div>
          <div class="slider-row"><label>EV</label><input type="range" min="-20" max="20" step="0.5" value="${sw.sen.ev}" data-race="sen" data-mode-k="ev" /><span class="slider-val">${signedFloat(sw.sen.ev)}</span></div>
          <div class="slider-row"><label>VBM</label><input type="range" min="-20" max="20" step="0.5" value="${sw.sen.vbm}" data-race="sen" data-mode-k="vbm" /><span class="slider-val">${signedFloat(sw.sen.vbm)}</span></div>
        </div>
        <div class="race-section">
          <div class="race-label">Assembly swing</div>
          <div class="slider-row"><label>ED</label><input type="range" min="-20" max="20" step="0.5" value="${sw.asm.ed}" data-race="asm" data-mode-k="ed" /><span class="slider-val">${signedFloat(sw.asm.ed)}</span></div>
          <div class="slider-row"><label>EV</label><input type="range" min="-20" max="20" step="0.5" value="${sw.asm.ev}" data-race="asm" data-mode-k="ev" /><span class="slider-val">${signedFloat(sw.asm.ev)}</span></div>
          <div class="slider-row"><label>VBM</label><input type="range" min="-20" max="20" step="0.5" value="${sw.asm.vbm}" data-race="asm" data-mode-k="vbm" /><span class="slider-val">${signedFloat(sw.asm.vbm)}</span></div>
        </div>
      `;
      block.querySelectorAll("input[type=range]").forEach(input => {
        input.addEventListener("input", () => {
          const race = input.dataset.race;
          const k = input.dataset.modeK;
          const v = +input.value;
          state.muniSwing[name][race][k] = v;
          input.parentElement.querySelector(".slider-val").textContent = signedFloat(v);
          markMuniTouched(block, name);
          recompute();
        });
      });
      list.appendChild(block);
      markMuniTouched(block, name);
    });
  }
  function markMuniTouched(block, name) {
    const sw = state.muniSwing[name];
    const touched = ["sen","asm"].some(r => MODE_KEYS.some(k => sw[r][k] !== 0));
    block.classList.toggle("touched", touched);
  }

  function hydrateControlsFromState() {
    document.querySelector(`input[name=mode][value=${state.mode}]`).checked = true;
    document.querySelector(`input[name=metric][value=${state.metric}]`).checked = true;
    document.querySelector(`input[name=race][value=${state.raceFocus}]`).checked = true;
    document.querySelector(`input[name=view][value=${state.view}]`).checked = true;
    setSlider("sen-sw-ed", state.senSwing.ed, signedFloat);
    setSlider("sen-sw-ev", state.senSwing.ev, signedFloat);
    setSlider("sen-sw-vbm", state.senSwing.vbm, signedFloat);
    setSlider("asm-sw-ed", state.asmSwing.ed, signedFloat);
    setSlider("asm-sw-ev", state.asmSwing.ev, signedFloat);
    setSlider("asm-sw-vbm", state.asmSwing.vbm, signedFloat);
    setSlider("sh-ed", state.cwShare.ed, v => (Math.round(v*10)/10).toFixed(1) + "%");
    setSlider("sh-ev", state.cwShare.ev, v => (Math.round(v*10)/10).toFixed(1) + "%");
    setSlider("sh-vbm", state.cwShare.vbm, v => (Math.round(v*10)/10).toFixed(1) + "%");
    setSlider("bullet", state.bullet, v => v.toFixed(1) + "%");
    setSlider("intra-d", state.intraD, v => v.toFixed(1) + "%");
    setSlider("intra-r", state.intraR, v => v.toFixed(1) + "%");
    setSlider("coattail", state.coattail, v => v.toFixed(2));
    updateSliderEnable();
  }
  function setSlider(id, v, fmtFn) {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = v;
    const valEl = document.getElementById(id + "-val");
    if (valEl) valEl.textContent = fmtFn(+v);
  }
  function updateSliderEnable() {
    const on = state.view === "scenario";
    document.querySelectorAll("#scenario-panel input[type=range]").forEach(el => { el.disabled = !on; });
    document.querySelectorAll("#scenario-panel fieldset").forEach(el => { el.disabled = !on; });
    document.getElementById("reset-btn").disabled = !on;
  }

  // View toggle
  document.querySelectorAll("input[name=view]").forEach(el => {
    el.addEventListener("change", e => { state.view = e.target.value; updateSliderEnable(); recompute(); });
  });
  // Mode / metric / race-focus
  document.getElementById("mode-group").addEventListener("change", e => {
    if (e.target.name === "mode") { state.mode = e.target.value; recompute(); }
  });
  document.querySelectorAll("input[name=metric]").forEach(el => {
    el.addEventListener("change", e => { state.metric = e.target.value; recompute(); });
  });
  document.querySelectorAll("input[name=race]").forEach(el => {
    el.addEventListener("change", e => { state.raceFocus = e.target.value; recompute(); });
  });

  // Senate / Assembly swings (district-wide)
  for (const [id, race, key] of [
    ["sen-sw-ed", "senSwing", "ed"], ["sen-sw-ev", "senSwing", "ev"], ["sen-sw-vbm", "senSwing", "vbm"],
    ["asm-sw-ed", "asmSwing", "ed"], ["asm-sw-ev", "asmSwing", "ev"], ["asm-sw-vbm", "asmSwing", "vbm"],
  ]) {
    document.getElementById(id).addEventListener("input", e => {
      state[race][key] = +e.target.value;
      document.getElementById(id + "-val").textContent = signedFloat(+e.target.value);
      recompute();
    });
  }

  // Shares (coupled)
  function adjustShares(movedKey, newVal) {
    const [lo, hi] = SHARE_BOUNDS[movedKey];
    newVal = clamp(newVal, lo, hi);
    state.cwShare[movedKey] = newVal;
    const others = ["ed","ev","vbm"].filter(k => k !== movedKey);
    const remaining = 100 - newVal;
    const oldSum = state.cwShare[others[0]] + state.cwShare[others[1]];
    if (oldSum > 0.0001) {
      state.cwShare[others[0]] = state.cwShare[others[0]] / oldSum * remaining;
      state.cwShare[others[1]] = state.cwShare[others[1]] / oldSum * remaining;
    } else {
      state.cwShare[others[0]] = remaining / 2;
      state.cwShare[others[1]] = remaining / 2;
    }
    for (const k of others) {
      const [olo, ohi] = SHARE_BOUNDS[k];
      state.cwShare[k] = clamp(state.cwShare[k], olo, ohi);
    }
    const s = state.cwShare.ed + state.cwShare.ev + state.cwShare.vbm;
    if (Math.abs(s - 100) > 0.01 && s > 0) {
      state.cwShare.ed  *= 100 / s;
      state.cwShare.ev  *= 100 / s;
      state.cwShare.vbm *= 100 / s;
    }
    state.cwShare[movedKey] = clamp(state.cwShare[movedKey], lo, hi);
  }
  function refreshShareUI() {
    const f = v => (Math.round(v*10)/10).toFixed(1) + "%";
    setSlider("sh-ed",  state.cwShare.ed,  f);
    setSlider("sh-ev",  state.cwShare.ev,  f);
    setSlider("sh-vbm", state.cwShare.vbm, f);
  }
  for (const [id, key] of [["sh-ed","ed"], ["sh-ev","ev"], ["sh-vbm","vbm"]]) {
    document.getElementById(id).addEventListener("input", e => {
      adjustShares(key, +e.target.value);
      refreshShareUI();
      recompute();
    });
  }

  // Extras
  document.getElementById("bullet").addEventListener("input", e => {
    state.bullet = +e.target.value;
    document.getElementById("bullet-val").textContent = state.bullet.toFixed(1) + "%";
    recompute();
  });
  document.getElementById("intra-d").addEventListener("input", e => {
    state.intraD = +e.target.value;
    document.getElementById("intra-d-val").textContent = state.intraD.toFixed(1) + "%";
    recompute();
  });
  document.getElementById("intra-r").addEventListener("input", e => {
    state.intraR = +e.target.value;
    document.getElementById("intra-r-val").textContent = state.intraR.toFixed(1) + "%";
    recompute();
  });
  document.getElementById("coattail").addEventListener("input", e => {
    state.coattail = +e.target.value;
    document.getElementById("coattail-val").textContent = state.coattail.toFixed(2);
    recompute();
  });

  // Reset
  document.getElementById("reset-btn").addEventListener("click", () => {
    state.senSwing = { ed: 0, ev: 0, vbm: 0 };
    state.asmSwing = { ed: 0, ev: 0, vbm: 0 };
    state.cwShare = { ...defaultShare };
    state.bullet = DEFAULTS.bullet;
    state.intraD = DEFAULTS.intraD;
    state.intraR = DEFAULTS.intraR;
    state.coattail = DEFAULTS.coattail;
    for (const k of Object.keys(state.muniSwing)) {
      state.muniSwing[k] = { sen: { ed: 0, ev: 0, vbm: 0 }, asm: { ed: 0, ev: 0, vbm: 0 } };
    }
    hydrateControlsFromState();
    document.querySelectorAll(".muni-block").forEach(b => {
      const name = b.dataset.muni;
      b.querySelectorAll("input[type=range]").forEach(inp => {
        inp.value = 0;
        inp.parentElement.querySelector(".slider-val").textContent = "+0.0";
      });
      markMuniTouched(b, name);
    });
    recompute();
  });

  // Share
  document.getElementById("share-btn").addEventListener("click", async () => {
    const url = location.href;
    try {
      await navigator.clipboard.writeText(url);
      document.getElementById("share-status").textContent = "URL copied to clipboard.";
    } catch {
      document.getElementById("share-status").textContent = url;
    }
  });
})();
