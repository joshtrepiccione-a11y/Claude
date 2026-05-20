(() => {
  // ===== Mode metadata (mirrors NJ-2 site) =====
  const MODES = {
    total: { harris: "pres_harris",   trump: "pres_trump",   other: "pres_other",   total: "pres_total",   margin: "pres_margin_pct",   label: "Total",        key: "total" },
    ed:    { harris: "ed_harris",     trump: "ed_trump",     other: "ed_other",     total: "ed_total",     margin: "ed_margin_pct",     label: "Election Day", key: "ed" },
    early: { harris: "early_harris",  trump: "early_trump",  other: "early_other",  total: "early_total",  margin: "early_margin_pct",  label: "Early Voting", key: "early" },
    vbm:   { harris: "vbm_harris",    trump: "vbm_trump",    other: "vbm_other",    total: "vbm_total",    margin: "vbm_margin_pct",    label: "Vote by Mail", key: "vbm" },
  };
  const MODE_KEYS = ["ed", "early", "vbm"];
  const SHARE_BOUNDS = { ed: [30, 80], ev: [0, 40], vbm: [0, 60] };

  // ===== State =====
  const state = {
    mode: "total",
    metric: "margin",
    view: "baseline", // or "scenario"
    cwSwing: { ed: 0, ev: 0, vbm: 0 },      // points D-R
    cwShare: { ed: 55, ev: 15, vbm: 30 },   // percent of turnout; set from data once loaded
    muniSwing: {},                          // {muni: {ed,ev,vbm}}
  };
  let defaultShare = { ed: 55, ev: 15, vbm: 30 };
  let municipalities = []; // sorted list of unique muni names

  // ===== URL state =====
  function parseUrl() {
    const params = new URLSearchParams(location.hash.slice(1));
    if (params.get("mode") && MODES[params.get("mode")]) state.mode = params.get("mode");
    if (params.get("metric") === "turnout" || params.get("metric") === "margin") state.metric = params.get("metric");
    if (params.get("view") === "scenario") state.view = "scenario";
    if (params.get("sw")) {
      const parts = params.get("sw").split(",").map(Number);
      if (parts.length === 3 && parts.every(Number.isFinite)) {
        state.cwSwing.ed = clamp(parts[0], -15, 15);
        state.cwSwing.ev = clamp(parts[1], -15, 15);
        state.cwSwing.vbm = clamp(parts[2], -15, 15);
      }
    }
    if (params.get("sh")) {
      const parts = params.get("sh").split(",").map(Number);
      if (parts.length === 3 && parts.every(Number.isFinite)) {
        state.cwShare.ed = parts[0];
        state.cwShare.ev = parts[1];
        state.cwShare.vbm = parts[2];
      }
    }
    // Per-municipality overrides parsed after munis are known.
  }
  function parseMuniUrl() {
    const params = new URLSearchParams(location.hash.slice(1));
    const mu = params.get("mu");
    if (!mu) return;
    for (const item of mu.split(";")) {
      if (!item) continue;
      const m = item.match(/^(\d+):(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)$/);
      if (!m) continue;
      const idx = +m[1];
      if (idx < 0 || idx >= municipalities.length) continue;
      const name = municipalities[idx];
      state.muniSwing[name] = {
        ed:  clamp(+m[2], -20, 20),
        ev:  clamp(+m[3], -20, 20),
        vbm: clamp(+m[4], -20, 20),
      };
    }
  }
  function syncUrl() {
    const p = new URLSearchParams();
    if (state.mode !== "total") p.set("mode", state.mode);
    if (state.metric !== "margin") p.set("metric", state.metric);
    if (state.view !== "baseline") p.set("view", state.view);
    const swDefault = state.cwSwing.ed === 0 && state.cwSwing.ev === 0 && state.cwSwing.vbm === 0;
    if (!swDefault) {
      p.set("sw", [state.cwSwing.ed, state.cwSwing.ev, state.cwSwing.vbm].map(fmtNum).join(","));
    }
    const shDefault =
      approxEq(state.cwShare.ed, defaultShare.ed) &&
      approxEq(state.cwShare.ev, defaultShare.ev) &&
      approxEq(state.cwShare.vbm, defaultShare.vbm);
    if (!shDefault) {
      p.set("sh", [state.cwShare.ed, state.cwShare.ev, state.cwShare.vbm].map(fmtNum).join(","));
    }
    const muParts = [];
    municipalities.forEach((name, idx) => {
      const s = state.muniSwing[name];
      if (!s) return;
      if (s.ed === 0 && s.ev === 0 && s.vbm === 0) return;
      muParts.push(`${idx}:${fmtNum(s.ed)},${fmtNum(s.ev)},${fmtNum(s.vbm)}`);
    });
    if (muParts.length) p.set("mu", muParts.join(";"));
    const h = p.toString();
    history.replaceState(null, "", h ? "#" + h : location.pathname);
  }

  function fmtNum(n) {
    return Number.isInteger(n) ? String(n) : (Math.round(n * 10) / 10).toString();
  }
  function approxEq(a, b) { return Math.abs(a - b) < 0.05; }
  function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }

  // ===== Color logic (from NJ-2 site) =====
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

  function fmt(n) { return Math.round(n).toLocaleString("en-US"); }
  function pct(n) { return (n >= 0 ? "+" : "") + n.toFixed(1) + "%"; }
  function signed(n) { return (n >= 0 ? "+" : "") + fmt(n); }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  }

  // ===== Map setup =====
  const map = L.map("map", { preferCanvas: true, zoomControl: true })
    .setView([39.45, -74.65], 10);
  L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
    attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: "abcd",
    maxZoom: 18,
  }).addTo(map);

  let geojson, layer;
  let maxTotal = 1;
  let computed = new Map(); // featureId -> scenario-applied {ed:{h,t,o,total}, early:..., vbm:..., total:{h,t,o,total}, margin}

  parseUrl();

  fetch("data/atlantic_precincts.geojson")
    .then(r => r.json())
    .then(fc => {
      geojson = fc;
      // Collect municipality list (sorted alphabetically for stable URL indices).
      const set = new Set();
      for (const f of fc.features) {
        if (!f.properties.municipality) f.properties.municipality = f.properties.precinct;
        set.add(f.properties.municipality);
      }
      municipalities = Array.from(set).sort((a, b) => a.localeCompare(b));
      municipalities.forEach(name => { state.muniSwing[name] = { ed: 0, ev: 0, vbm: 0 }; });

      // Compute county-wide default mode shares from the baseline data.
      let ed = 0, ev = 0, vbm = 0, tot = 0;
      for (const f of fc.features) {
        const p = f.properties;
        ed += p.ed_total || 0;
        ev += p.early_total || 0;
        vbm += p.vbm_total || 0;
        tot += p.pres_total || 0;
      }
      if (tot > 0) {
        defaultShare = {
          ed: +(ed / tot * 100).toFixed(2),
          ev: +(ev / tot * 100).toFixed(2),
          vbm: +(vbm / tot * 100).toFixed(2),
        };
        // Re-normalize to exactly 100
        const s = defaultShare.ed + defaultShare.ev + defaultShare.vbm;
        defaultShare.ed *= 100 / s;
        defaultShare.ev *= 100 / s;
        defaultShare.vbm *= 100 / s;
      }
      // If URL didn't override shares, use defaults.
      const params = new URLSearchParams(location.hash.slice(1));
      if (!params.get("sh")) {
        state.cwShare = { ...defaultShare };
      }
      parseMuniUrl();

      buildMuniControls();
      hydrateControlsFromState();

      layer = L.geoJSON(fc, {
        style: styleFor,
        onEachFeature: (feat, lyr) => {
          lyr.on("mouseover", () => {
            lyr.setStyle({ weight: 2, color: "#fff" });
            showHover(feat);
          });
          lyr.on("mouseout", () => layer.resetStyle(lyr));
        },
      }).addTo(map);
      map.fitBounds(layer.getBounds(), { padding: [16, 16] });
      renderModeStats();
      recompute();
    })
    .catch(err => {
      document.getElementById("totals").textContent = "Failed to load data: " + err;
    });

  // ===== Scenario math =====
  // For a given precinct feature, return the per-mode H/T/O totals after
  // applying the current scenario (or baseline if scenario is off).
  function computeFeature(feat) {
    const p = feat.properties;
    const baseModes = {
      ed:    { h: p.ed_harris,    t: p.ed_trump,    o: p.ed_other,    total: p.ed_total },
      early: { h: p.early_harris, t: p.early_trump, o: p.early_other, total: p.early_total },
      vbm:   { h: p.vbm_harris,   t: p.vbm_trump,   o: p.vbm_other,   total: p.vbm_total },
    };
    if (state.view !== "scenario") {
      const tot = { h: p.pres_harris, t: p.pres_trump, o: p.pres_other, total: p.pres_total };
      return { ...baseModes, total: tot };
    }
    // Scenario: re-allocate this precinct's pres_total across modes
    // using county-wide shares, then apply swings per mode.
    const muni = p.municipality;
    const muniSw = state.muniSwing[muni] || { ed: 0, ev: 0, vbm: 0 };
    const grand = p.pres_total || 0;
    const newShareByMode = {
      ed:    state.cwShare.ed  / 100,
      early: state.cwShare.ev  / 100,
      vbm:   state.cwShare.vbm / 100,
    };
    const swingByMode = {
      ed:    state.cwSwing.ed  + muniSw.ed,
      early: state.cwSwing.ev  + muniSw.ev,
      vbm:   state.cwSwing.vbm + muniSw.vbm,
    };

    const out = {};
    let totH = 0, totT = 0, totO = 0;
    for (const m of ["ed", "early", "vbm"]) {
      const base = baseModes[m];
      // Seed candidate H/T/O shares from baseline mode breakdown when
      // possible; otherwise fall back to precinct's overall H/T/O ratio.
      let hs, ts, os;
      if (base.total > 0) {
        hs = base.h / base.total;
        ts = base.t / base.total;
        os = base.o / base.total;
      } else if (grand > 0) {
        hs = p.pres_harris / grand;
        ts = p.pres_trump  / grand;
        os = p.pres_other  / grand;
      } else {
        hs = ts = os = 0;
      }
      // Apply D-R swing: shift swing/2 points from R to D.
      const delta = swingByMode[m] / 200; // points -> fraction, halved
      hs += delta;
      ts -= delta;
      // Clamp negatives, keep Other fixed, renormalize H+T+O to 1.
      if (hs < 0) hs = 0;
      if (ts < 0) ts = 0;
      if (os < 0) os = 0;
      const sum = hs + ts + os;
      if (sum > 0) { hs /= sum; ts /= sum; os /= sum; }
      const newTotal = grand * newShareByMode[m];
      const newH = newTotal * hs;
      const newT = newTotal * ts;
      const newO = newTotal * os;
      out[m] = { h: newH, t: newT, o: newO, total: newTotal };
      totH += newH; totT += newT; totO += newO;
    }
    out.total = { h: totH, t: totT, o: totO, total: totH + totT + totO };
    return out;
  }

  function marginPct(slice) {
    if (!slice.total) return 0;
    return (slice.h - slice.t) / slice.total * 100;
  }

  function rebuildComputed() {
    computed = new Map();
    let m = 0;
    for (const f of geojson.features) {
      const c = computeFeature(f);
      computed.set(f, c);
      const key = state.mode === "total" ? "total" : (state.mode === "ed" ? "ed" : state.mode === "early" ? "early" : "vbm");
      m = Math.max(m, c[key].total);
    }
    maxTotal = m;
  }

  function activeSlice(feat) {
    const c = computed.get(feat);
    if (!c) return null;
    if (state.mode === "total") return c.total;
    if (state.mode === "ed") return c.ed;
    if (state.mode === "early") return c.early;
    return c.vbm;
  }
  function baseActiveSlice(feat) {
    const p = feat.properties;
    const m = MODES[state.mode];
    return { h: p[m.harris], t: p[m.trump], o: p[m.other], total: p[m.total] };
  }

  function styleFor(feat) {
    const slice = activeSlice(feat);
    if (!slice) return { color: "#1a1f27", weight: 0.4, fillColor: "#444", fillOpacity: 0.5 };
    const fill = state.metric === "margin"
      ? marginColor(marginPct(slice))
      : turnoutColor(slice.total, maxTotal);
    return { color: "#1a1f27", weight: 0.4, fillColor: fill, fillOpacity: 0.85 };
  }

  // ===== Provenance labelling =====
  function baseSource(feat) {
    if (state.mode === "total") return "real";
    const ms = feat.properties.mode_source || {};
    return ms[state.mode] || "modeled";
  }
  function precinctSource(feat) {
    const base = baseSource(feat);
    return state.view === "scenario" ? `scenario (based on ${base})` : base;
  }
  function precinctSourceClass(feat) {
    if (state.view === "scenario") return "scenario";
    return baseSource(feat);
  }

  // ===== Render =====
  function recompute() {
    document.body.classList.toggle("scenario-on", state.view === "scenario");
    rebuildComputed();
    if (layer) layer.setStyle(styleFor);
    renderTotals();
    renderLegend();
    updateModeStatTagsForScenario();
    syncUrl();
  }

  function renderTotals() {
    const m = MODES[state.mode];
    let h = 0, t = 0, o = 0, tot = 0, prec = 0;
    let baseH = 0, baseT = 0, baseO = 0, baseTot = 0;
    let realPrec = 0;
    let flipsToD = [], flipsToR = [];
    for (const f of geojson.features) {
      prec++;
      const c = computed.get(f);
      const slice = state.mode === "total" ? c.total : c[state.mode === "early" ? "early" : state.mode];
      h += slice.h; t += slice.t; o += slice.o; tot += slice.total;
      const bp = f.properties;
      baseH += bp[m.harris]; baseT += bp[m.trump]; baseO += bp[m.other]; baseTot += bp[m.total];
      if (state.mode === "total" || (bp.mode_source && bp.mode_source[state.mode] === "real")) realPrec++;
      // Flips judged on TOTAL mode (presidential overall outcome).
      const bMargin = bp.pres_margin_pct;
      const sMargin = marginPct(c.total);
      if (bMargin <= 0 && sMargin > 0) flipsToD.push(f);
      else if (bMargin >= 0 && sMargin < 0) flipsToR.push(f);
    }
    const safeTot = Math.max(1, tot);
    const hp = h / safeTot * 100, tp = t / safeTot * 100, op = o / safeTot * 100;
    const margin = hp - tp;
    document.getElementById("totals").innerHTML = `
      <div class="d-row name">Harris (D)</div><div>${fmt(h)}</div><div class="pct">${hp.toFixed(1)}%</div>
      <div class="r-row name">Trump (R)</div><div>${fmt(t)}</div><div class="pct">${tp.toFixed(1)}%</div>
      <div class="o-row name">Other</div><div>${fmt(o)}</div><div class="pct">${op.toFixed(1)}%</div>
      <div class="name">Total</div><div>${fmt(tot)}</div><div class="pct">${pct(margin)}</div>
    `;
    const bar = document.getElementById("totals-bar");
    bar.querySelector(".d").style.width = hp + "%";
    bar.querySelector(".r").style.width = tp + "%";
    bar.querySelector(".o").style.width = op + "%";

    const baseProv = state.mode === "total"
      ? "real"
      : realPrec === prec ? "real"
      : realPrec === 0 ? "modeled"
      : `${realPrec}/${prec} precincts real, rest modeled`;
    const provenance = state.view === "scenario" ? `scenario (based on ${baseProv})` : baseProv;
    document.getElementById("totals-meta").textContent =
      `${prec} precincts · ${m.label} · ${provenance}`;

    const scenEl = document.getElementById("totals-scenario");
    if (state.view !== "scenario") {
      scenEl.classList.add("hidden");
      scenEl.innerHTML = "";
      return;
    }
    scenEl.classList.remove("hidden");
    const dH = h - baseH, dT = t - baseT, dO = o - baseO;
    const baseMargin = baseTot ? (baseH - baseT) / baseTot * 100 : 0;
    const dMargin = margin - baseMargin;
    scenEl.innerHTML = `
      <div class="delta-row"><span class="lbl">vs certified (${m.label}):</span><span></span></div>
      <div class="delta-row"><span class="lbl">Harris</span><span class="${dH >= 0 ? 'delta-pos' : 'delta-neg'}">${signed(dH)}</span></div>
      <div class="delta-row"><span class="lbl">Trump</span><span class="${dT >= 0 ? 'delta-pos' : 'delta-neg'}">${signed(dT)}</span></div>
      <div class="delta-row"><span class="lbl">Other</span><span class="${dO >= 0 ? 'delta-pos' : 'delta-neg'}">${signed(dO)}</span></div>
      <div class="delta-row"><span class="lbl">Margin</span><span class="${dMargin >= 0 ? 'delta-pos' : 'delta-neg'}">${pct(dMargin)}</span></div>
      <div class="delta-row" style="margin-top:6px;"><span class="lbl">Precincts flipped</span><span>${flipsToD.length + flipsToR.length}</span></div>
      ${flipsToD.length ? `<div class="delta-row"><span class="lbl">&nbsp;&nbsp;R&rarr;D</span><span class="flip-d">${flipsToD.length}</span></div>` : ""}
      ${flipsToR.length ? `<div class="delta-row"><span class="lbl">&nbsp;&nbsp;D&rarr;R</span><span class="flip-r">${flipsToR.length}</span></div>` : ""}
      ${(flipsToD.length + flipsToR.length) ? `<div class="flip-list">${
        flipsToD.map(f => `<div class="flip-d">R&rarr;D · ${escapeHtml(f.properties.precinct)}</div>`).join("") +
        flipsToR.map(f => `<div class="flip-r">D&rarr;R · ${escapeHtml(f.properties.precinct)}</div>`).join("")
      }</div>` : ""}
    `;
  }

  function renderLegend() {
    const el = document.getElementById("legend");
    if (state.metric === "margin") {
      el.innerHTML = `
        <span>R+40</span>
        <span class="swatch" style="background:linear-gradient(to right,
          ${marginColor(-40)},${marginColor(-20)},${marginColor(0)},${marginColor(20)},${marginColor(40)});width:160px;"></span>
        <span>D+40</span>
      `;
    } else {
      el.innerHTML = `
        <span>0</span>
        <span class="swatch" style="background:linear-gradient(to right,
          ${turnoutColor(0,1)},${turnoutColor(0.5,1)},${turnoutColor(1,1)});width:160px;"></span>
        <span>${fmt(Math.round(maxTotal))}</span>
      `;
    }
  }

  function showHover(feat) {
    const m = MODES[state.mode];
    const p = feat.properties;
    const slice = activeSlice(feat);
    const base = baseActiveSlice(feat);
    const grand = p.pres_total;
    const modeShare = grand && slice.total ? (slice.total / grand * 100).toFixed(0) : "0";
    const src = precinctSource(feat);
    const srcCls = precinctSourceClass(feat);
    const margin = marginPct(slice);
    const hpct = slice.total ? slice.h / slice.total * 100 : 0;
    const tpct = slice.total ? slice.t / slice.total * 100 : 0;
    const vsCert = state.view === "scenario" ? `
      <div class="vs-cert">
        <div class="row"><span class="lbl">vs certified Harris</span><span class="${slice.h - base.h >= 0 ? 'delta-pos' : 'delta-neg'}">${signed(slice.h - base.h)}</span></div>
        <div class="row"><span class="lbl">vs certified Trump</span><span class="${slice.t - base.t >= 0 ? 'delta-pos' : 'delta-neg'}">${signed(slice.t - base.t)}</span></div>
        <div class="row"><span class="lbl">vs certified margin</span><span>${pct(margin - (base.total ? (base.h - base.t)/base.total*100 : 0))}</span></div>
      </div>` : "";
    document.getElementById("hover").innerHTML = `
      <h3>${escapeHtml(p.precinct)}</h3>
      <p class="subline">${escapeHtml(p.municipality)} · ${escapeHtml(p.county)} County · ${m.label} <em class="tag ${srcCls}">${escapeHtml(src)}</em></p>
      <div class="row"><span class="lbl">Harris (D)</span><span>${fmt(slice.h)} · ${hpct.toFixed(1)}%</span></div>
      <div class="row"><span class="lbl">Trump (R)</span><span>${fmt(slice.t)} · ${tpct.toFixed(1)}%</span></div>
      <div class="row"><span class="lbl">Other</span><span>${fmt(slice.o)}</span></div>
      <div class="row"><span class="lbl">Total (${m.label})</span><span>${fmt(slice.total)}</span></div>
      <div class="row"><span class="lbl">Margin</span><span style="color:${margin>=0?'var(--dem)':'var(--rep)'}">${pct(margin)}</span></div>
      ${state.mode !== "total" ? `<div class="row"><span class="lbl">Share of precinct turnout</span><span>${modeShare}%</span></div>` : ""}
      ${vsCert}
    `;
  }

  // ===== Mode-stat tags in the Vote-mode panel =====
  function renderModeStats() {
    const n = geojson.features.length;
    const totalTag = document.querySelector('[data-mode-stat="total"]');
    if (totalTag) { totalTag.textContent = "real"; totalTag.className = "tag real"; }
    for (const k of MODE_KEYS) {
      let real = 0;
      for (const f of geojson.features) {
        const ms = f.properties.mode_source || {};
        if (ms[k] === "real") real++;
      }
      const tag = document.querySelector(`[data-mode-stat="${k}"]`);
      if (!tag) continue;
      const pctReal = Math.round(real / n * 100);
      if (real === n)      { tag.textContent = "real";    tag.className = "tag real"; }
      else if (real === 0) { tag.textContent = "modeled"; tag.className = "tag modeled"; }
      else                 { tag.textContent = `${pctReal}% real`; tag.className = "tag partial"; }
    }
  }
  function updateModeStatTagsForScenario() {
    if (state.view !== "scenario") { renderModeStats(); return; }
    // In scenario mode, flip all tags to "scenario" while preserving the
    // underlying real/modeled mix in the title attribute.
    const all = document.querySelectorAll("[data-mode-stat]");
    all.forEach(tag => {
      const key = tag.getAttribute("data-mode-stat");
      let base;
      if (key === "total") base = "real";
      else {
        let real = 0;
        for (const f of geojson.features) {
          const ms = f.properties.mode_source || {};
          if (ms[key] === "real") real++;
        }
        base = real === geojson.features.length ? "real"
             : real === 0 ? "modeled"
             : `${Math.round(real/geojson.features.length*100)}% real`;
      }
      tag.textContent = "scenario";
      tag.className = "tag scenario";
      tag.title = `scenario (based on ${base})`;
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
    municipalities.forEach((name, idx) => {
      const sw = state.muniSwing[name];
      const block = document.createElement("div");
      block.className = "muni-block";
      block.dataset.muni = name;
      block.innerHTML = `
        <div class="muni-name"><span>${escapeHtml(name)}</span><span class="count">${counts[name]} prec.</span></div>
        <div class="slider-row"><label>ED</label><input type="range" min="-20" max="20" step="0.5" value="${sw.ed}" data-muni-mode="ed" /><span class="slider-val">${signedFloat(sw.ed)}</span></div>
        <div class="slider-row"><label>EV</label><input type="range" min="-20" max="20" step="0.5" value="${sw.ev}" data-muni-mode="ev" /><span class="slider-val">${signedFloat(sw.ev)}</span></div>
        <div class="slider-row"><label>VBM</label><input type="range" min="-20" max="20" step="0.5" value="${sw.vbm}" data-muni-mode="vbm" /><span class="slider-val">${signedFloat(sw.vbm)}</span></div>
      `;
      block.querySelectorAll("input[type=range]").forEach(input => {
        input.addEventListener("input", () => {
          const k = input.dataset.muniMode;
          const v = +input.value;
          state.muniSwing[name][k] = v;
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
    const touched = sw.ed !== 0 || sw.ev !== 0 || sw.vbm !== 0;
    block.classList.toggle("touched", touched);
  }
  function signedFloat(v) {
    const r = Math.round(v * 10) / 10;
    return (r >= 0 ? "+" : "") + r.toFixed(1);
  }

  function hydrateControlsFromState() {
    document.querySelector(`input[name=mode][value=${state.mode}]`).checked = true;
    document.querySelector(`input[name=metric][value=${state.metric}]`).checked = true;
    document.querySelector(`input[name=view][value=${state.view}]`).checked = true;
    // CW swings
    setSlider("sw-ed", state.cwSwing.ed);
    setSlider("sw-ev", state.cwSwing.ev);
    setSlider("sw-vbm", state.cwSwing.vbm);
    // CW shares
    setSlider("sh-ed", state.cwShare.ed);
    setSlider("sh-ev", state.cwShare.ev);
    setSlider("sh-vbm", state.cwShare.vbm);
    updateSliderEnable();
  }
  function setSlider(id, v) {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = v;
    const valEl = document.getElementById(id + "-val");
    if (valEl) {
      if (id.startsWith("sw-")) valEl.textContent = signedFloat(v);
      else valEl.textContent = (Math.round(v * 10) / 10).toFixed(1) + "%";
    }
  }
  function updateSliderEnable() {
    const on = state.view === "scenario";
    document.querySelectorAll("#scenario-panel input[type=range]").forEach(el => { el.disabled = !on; });
    document.querySelectorAll("#scenario-panel fieldset").forEach(el => { el.disabled = !on; });
    document.getElementById("reset-btn").disabled = !on;
  }

  // View toggle
  document.querySelectorAll("input[name=view]").forEach(el => {
    el.addEventListener("change", e => {
      state.view = e.target.value;
      updateSliderEnable();
      recompute();
    });
  });
  // Mode + metric
  document.getElementById("mode-group").addEventListener("change", e => {
    if (e.target.name === "mode") { state.mode = e.target.value; recompute(); }
  });
  document.querySelectorAll("input[name=metric]").forEach(el => {
    el.addEventListener("change", e => { state.metric = e.target.value; recompute(); });
  });

  // County-wide swings
  for (const [id, key] of [["sw-ed","ed"], ["sw-ev","ev"], ["sw-vbm","vbm"]]) {
    document.getElementById(id).addEventListener("input", e => {
      state.cwSwing[key] = +e.target.value;
      document.getElementById(id + "-val").textContent = signedFloat(+e.target.value);
      recompute();
    });
  }

  // County-wide shares: coupled — when one moves, scale the other two
  // proportionally; clamp at bounds; final pass renormalizes to 100%.
  function adjustShares(movedKey, newVal) {
    const [lo, hi] = SHARE_BOUNDS[movedKey];
    newVal = clamp(newVal, lo, hi);
    state.cwShare[movedKey] = newVal;
    const others = ["ed", "ev", "vbm"].filter(k => k !== movedKey);
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
      // Renormalize all three so they sum to exactly 100. This may nudge
      // the moved slider; it's the documented behavior when a coupled
      // slider hits its bound.
      state.cwShare.ed  *= 100 / s;
      state.cwShare.ev  *= 100 / s;
      state.cwShare.vbm *= 100 / s;
    }
    // Re-clamp moved key in case normalization pushed it out
    state.cwShare[movedKey] = clamp(state.cwShare[movedKey], lo, hi);
  }
  function refreshShareUI() {
    setSlider("sh-ed", state.cwShare.ed);
    setSlider("sh-ev", state.cwShare.ev);
    setSlider("sh-vbm", state.cwShare.vbm);
  }
  for (const [id, key] of [["sh-ed","ed"], ["sh-ev","ev"], ["sh-vbm","vbm"]]) {
    document.getElementById(id).addEventListener("input", e => {
      adjustShares(key, +e.target.value);
      refreshShareUI();
      recompute();
    });
  }

  // Reset
  document.getElementById("reset-btn").addEventListener("click", () => {
    state.cwSwing = { ed: 0, ev: 0, vbm: 0 };
    state.cwShare = { ...defaultShare };
    for (const k of Object.keys(state.muniSwing)) state.muniSwing[k] = { ed: 0, ev: 0, vbm: 0 };
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

  // Share button
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
