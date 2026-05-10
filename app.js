(() => {
  const MODES = {
    total: { harris: "pres_harris", trump: "pres_trump", other: "pres_other", total: "pres_total", margin: "pres_margin_pct", label: "Total", real: true },
    ed:    { harris: "ed_harris",    trump: "ed_trump",    other: "ed_other",    total: "ed_total",    margin: "ed_margin_pct",    label: "Election Day", real: false },
    early: { harris: "early_harris", trump: "early_trump", other: "early_other", total: "early_total", margin: "early_margin_pct", label: "Early Voting",  real: false },
    vbm:   { harris: "vbm_harris",   trump: "vbm_trump",   other: "vbm_other",   total: "vbm_total",   margin: "vbm_margin_pct",   label: "Vote by Mail",  real: false },
  };

  const state = {
    mode: "total",
    metric: "margin",
  };

  // Parse URL state
  const params = new URLSearchParams(location.hash.slice(1));
  if (params.get("mode") && MODES[params.get("mode")]) state.mode = params.get("mode");
  if (params.get("metric") === "turnout" || params.get("metric") === "margin") state.metric = params.get("metric");

  const map = L.map("map", { preferCanvas: true, zoomControl: true }).setView([39.45, -74.85], 9);
  L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
    attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: "abcd",
    maxZoom: 18,
  }).addTo(map);

  // Diverging color ramp for margin (red -> white -> blue), single ramp for turnout.
  function marginColor(pct) {
    // pct = harris - trump
    const a = Math.max(-40, Math.min(40, pct)) / 40; // -1 .. +1
    if (a >= 0) {
      // white -> blue
      const t = a;
      const r = Math.round(255 + (44 - 255) * t);
      const g = Math.round(255 + (126 - 255) * t);
      const b = Math.round(255 + (248 - 255) * t);
      return `rgb(${r},${g},${b})`;
    } else {
      const t = -a;
      const r = Math.round(255 + (210 - 255) * t);
      const g = Math.round(255 + (63 - 255) * t);
      const b = Math.round(255 + (63 - 255) * t);
      return `rgb(${r},${g},${b})`;
    }
  }
  function turnoutColor(total, maxTotal) {
    const t = Math.min(1, total / Math.max(1, maxTotal));
    // dark -> bright yellow
    const r = Math.round(30 + (240 - 30) * t);
    const g = Math.round(30 + (200 - 30) * t);
    const b = Math.round(40 + (60 - 40) * t);
    return `rgb(${r},${g},${b})`;
  }

  function fmt(n) { return n.toLocaleString("en-US"); }
  function pct(n)  { return (n >= 0 ? "+" : "") + n.toFixed(1) + "%"; }

  let geojson, maxTotal = 1, layer;

  fetch("data/nj_cd2_precincts.geojson")
    .then(r => r.json())
    .then(fc => {
      geojson = fc;
      // Compute max for turnout scaling per-mode lazily
      layer = L.geoJSON(fc, {
        style: styleFor,
        onEachFeature: (feat, lyr) => {
          lyr.on("mouseover", () => {
            lyr.setStyle({ weight: 2, color: "#fff" });
            showHover(feat);
          });
          lyr.on("mouseout", () => {
            layer.resetStyle(lyr);
          });
        },
      }).addTo(map);
      map.fitBounds(layer.getBounds(), { padding: [20, 20] });
      renderModeStats();
      recompute();
    })
    .catch(err => {
      document.getElementById("totals").textContent = "Failed to load data: " + err;
    });

  function currentMaxTotal() {
    const k = MODES[state.mode].total;
    let m = 0;
    for (const f of geojson.features) m = Math.max(m, f.properties[k]);
    return m;
  }

  function styleFor(feat) {
    const m = MODES[state.mode];
    const p = feat.properties;
    let fill;
    if (state.metric === "margin") {
      fill = marginColor(p[m.margin]);
    } else {
      fill = turnoutColor(p[m.total], maxTotal);
    }
    return {
      color: "#1a1f27",
      weight: 0.4,
      fillColor: fill,
      fillOpacity: 0.85,
    };
  }

  function precinctSource(feat) {
    if (state.mode === "total") return "real";
    const ms = feat.properties.mode_source || {};
    return ms[state.mode] || "modeled";
  }

  function showHover(feat) {
    const m = MODES[state.mode];
    const p = feat.properties;
    const total = p[m.total];
    const h = p[m.harris], t = p[m.trump], o = p[m.other];
    const margin = p[m.margin];
    const grand = p.pres_total;
    const modeShare = grand ? (total / grand * 100).toFixed(0) : 0;
    const src = precinctSource(feat);
    const srcBadge = `<em class="tag ${src}">${src}</em>`;
    document.getElementById("hover").innerHTML = `
      <h3>${escapeHtml(p.precinct)}</h3>
      <p class="subline">${escapeHtml(p.county)} County · ${m.label} ${srcBadge}</p>
      <div class="row"><span class="lbl">Harris (D)</span><span>${fmt(h)} · ${total ? (h/total*100).toFixed(1) : "0"}%</span></div>
      <div class="row"><span class="lbl">Trump (R)</span><span>${fmt(t)} · ${total ? (t/total*100).toFixed(1) : "0"}%</span></div>
      <div class="row"><span class="lbl">Other</span><span>${fmt(o)}</span></div>
      <div class="row"><span class="lbl">Total (${m.label})</span><span>${fmt(total)}</span></div>
      <div class="row"><span class="lbl">Margin</span><span style="color:${margin>=0?'var(--dem)':'var(--rep)'}">${pct(margin)}</span></div>
      ${state.mode !== "total" ? `<div class="row"><span class="lbl">Share of precinct turnout</span><span>${modeShare}%</span></div>` : ""}
    `;
  }

  function renderModeStats() {
    const n = geojson.features.length;
    // Total mode is always real
    const totalTag = document.querySelector('[data-mode-stat="total"]');
    if (totalTag) { totalTag.textContent = "real"; totalTag.classList.add("real"); }
    for (const k of ["ed","early","vbm"]) {
      let real = 0;
      for (const f of geojson.features) {
        const ms = f.properties.mode_source || {};
        if (ms[k] === "real") real++;
      }
      const tag = document.querySelector(`[data-mode-stat="${k}"]`);
      if (!tag) continue;
      const pctReal = Math.round(real / n * 100);
      if (real === n) {
        tag.textContent = "real"; tag.classList.add("real"); tag.classList.remove("modeled","partial");
      } else if (real === 0) {
        tag.textContent = "modeled"; tag.classList.add("modeled"); tag.classList.remove("real","partial");
      } else {
        tag.textContent = `${pctReal}% real`; tag.classList.add("partial"); tag.classList.remove("real","modeled");
      }
    }
  }

  function recompute() {
    const m = MODES[state.mode];
    maxTotal = currentMaxTotal();
    if (layer) layer.setStyle(styleFor);
    renderTotals();
    renderLegend();
    syncUrl();
  }

  function renderTotals() {
    const m = MODES[state.mode];
    let h=0,t=0,o=0,tot=0,prec=0,realPrec=0;
    for (const f of geojson.features) {
      const p = f.properties;
      h += p[m.harris]; t += p[m.trump]; o += p[m.other]; tot += p[m.total]; prec++;
      if (state.mode === "total" || (p.mode_source && p.mode_source[state.mode] === "real")) realPrec++;
    }
    const safeTot = Math.max(1, tot);
    const hp = h/safeTot*100, tp = t/safeTot*100, op = o/safeTot*100;
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
    const provenance = state.mode === "total"
      ? "real"
      : realPrec === prec ? "real"
      : realPrec === 0 ? "modeled"
      : `${realPrec}/${prec} precincts real, rest modeled`;
    document.getElementById("totals-meta").textContent =
      `${prec} precincts · ${m.label} · ${provenance}`;
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

  function syncUrl() {
    const p = new URLSearchParams();
    if (state.mode !== "total") p.set("mode", state.mode);
    if (state.metric !== "margin") p.set("metric", state.metric);
    const h = p.toString();
    history.replaceState(null, "", h ? "#" + h : location.pathname);
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  }

  // Wire up controls
  document.getElementById("mode-group").addEventListener("change", e => {
    if (e.target.name === "mode") { state.mode = e.target.value; recompute(); }
  });
  // Set initial radio state from URL
  document.querySelector(`input[name=mode][value=${state.mode}]`).checked = true;
  document.querySelector(`input[name=metric][value=${state.metric}]`).checked = true;
  document.querySelectorAll("input[name=metric]").forEach(el => {
    el.addEventListener("change", e => { state.metric = e.target.value; recompute(); });
  });

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
