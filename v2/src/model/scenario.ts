// Scenario math: ports v1's app.js calculations to TypeScript with no
// behavior changes. Pure functions; no DOM, no React.
//
// Conventions (mirroring scripts/build_ld8.py):
//   - sen27_modes[m].total = voters in mode m (baseline)
//   - sen27_modes[m].d/r/o = voter-share counts in mode m (D/R/Other),
//                            summing to sen27_modes[m].total
//   - assem27_modes[m].total = voters in mode m
//   - assem27_modes[m].d/r/o = candidate-vote counts in mode m,
//                              calibrated at the historical bullet rate
//
// Senate uses half-shift logic: a swing of X points moves X/200 share
// from R to D (or vice versa). Assembly works the same way on
// ticket-level candidate-vote shares.

import type {
  AsmPrecinctResult,
  ModeKey,
  ModeSlice,
  PrecinctCollection,
  PrecinctFeature,
  PrecinctResult,
  ScenarioState,
  SenPrecinctResult,
  ViewKey,
} from "../data/types";

export const MODE_KEYS: ModeKey[] = ["ed", "early", "vbm"];

export type ComputeOptions = {
  view: ViewKey;
  scenario: ScenarioState;
  baselineDefaults: ScenarioState; // used to read the calibration-time bullet/intra
};

/** Apply half-shift partisan swing to ticket shares. */
export function shiftShares(
  d: number,
  r: number,
  o: number,
  swingPts: number,
): { d: number; r: number; o: number } {
  const delta = swingPts / 200;
  let ds = d + delta;
  let rs = r - delta;
  let os = o;
  if (ds < 0) ds = 0;
  if (rs < 0) rs = 0;
  if (os < 0) os = 0;
  const s = ds + rs + os;
  return s > 0 ? { d: ds / s, r: rs / s, o: os / s } : { d: 0, r: 0, o: 0 };
}

function tripletKey(k: ModeKey): "ed" | "ev" | "vbm" {
  return k === "early" ? "ev" : k;
}

function senSwingFor(state: ScenarioState, muni: string, k: ModeKey): number {
  const cw = state.senSwing[tripletKey(k)];
  const mu = state.muniOverrides[muni]?.sen[tripletKey(k)] ?? 0;
  return cw + mu;
}

function asmSwingFor(state: ScenarioState, muni: string, k: ModeKey): number {
  const cw = state.asmSwing[tripletKey(k)];
  const mu = state.muniOverrides[muni]?.asm[tripletKey(k)] ?? 0;
  return cw + mu + state.coattail * senSwingFor(state, muni, k);
}

function shareFor(state: ScenarioState, k: ModeKey): number {
  return state.cwShare[tripletKey(k)] / 100;
}

// ============================ Senate ============================

function senSliceFor(
  feat: PrecinctFeature,
  k: ModeKey,
  opts: ComputeOptions,
): ModeSlice {
  const base = feat.properties.sen27_modes[k];
  if (opts.view !== "scenario") {
    return { ...base };
  }
  const grand = feat.properties.sen27_baseline_total;
  const newTotal = grand * shareFor(opts.scenario, k);
  const sw = senSwingFor(opts.scenario, feat.properties.municipality, k);
  let ds = 0,
    rs = 0,
    os = 0;
  if (base.total > 0) {
    ds = base.d / base.total;
    rs = base.r / base.total;
    os = base.o / base.total;
  }
  const sh = shiftShares(ds, rs, os, sw);
  return {
    d: sh.d * newTotal,
    r: sh.r * newTotal,
    o: sh.o * newTotal,
    total: newTotal,
  };
}

function computeSen(feat: PrecinctFeature, opts: ComputeOptions): SenPrecinctResult {
  const byMode = {
    ed: senSliceFor(feat, "ed", opts),
    early: senSliceFor(feat, "early", opts),
    vbm: senSliceFor(feat, "vbm", opts),
  };
  const sum = (k: keyof ModeSlice): number =>
    byMode.ed[k] + byMode.early[k] + byMode.vbm[k];
  const total: ModeSlice = {
    d: sum("d"),
    r: sum("r"),
    o: sum("o"),
    total: sum("total"),
  };
  // Baseline for delta/flip detection: re-run with view=baseline
  let baselineTotal = total;
  if (opts.view === "scenario") {
    const baseOpts: ComputeOptions = { ...opts, view: "baseline" };
    const baseModes = {
      ed: senSliceFor(feat, "ed", baseOpts),
      early: senSliceFor(feat, "early", baseOpts),
      vbm: senSliceFor(feat, "vbm", baseOpts),
    };
    baselineTotal = {
      d: baseModes.ed.d + baseModes.early.d + baseModes.vbm.d,
      r: baseModes.ed.r + baseModes.early.r + baseModes.vbm.r,
      o: baseModes.ed.o + baseModes.early.o + baseModes.vbm.o,
      total:
        baseModes.ed.total + baseModes.early.total + baseModes.vbm.total,
    };
  }
  return { byMode, total, baselineTotal };
}

// ============================ Assembly ============================

type AsmModeOut = {
  d1: number;
  d2: number;
  r1: number;
  r2: number;
  o: number;
  d_total: number;
  r_total: number;
  total: number;
  voters: number;
  d_share: number;
  r_share: number;
  o_share: number;
};

function asmSliceFor(
  feat: PrecinctFeature,
  k: ModeKey,
  opts: ComputeOptions,
): AsmModeOut {
  const base = feat.properties.assem27_modes[k];
  const baseCand = base.d + base.r + base.o;
  let dShare = 0,
    rShare = 0,
    oShare = 0;
  if (baseCand > 0) {
    dShare = base.d / baseCand;
    rShare = base.r / baseCand;
    oShare = base.o / baseCand;
  }
  let voters: number;
  if (opts.view === "scenario") {
    voters = feat.properties.assem27_baseline_voters * shareFor(opts.scenario, k);
    const sw = asmSwingFor(opts.scenario, feat.properties.municipality, k);
    const sh = shiftShares(dShare, rShare, oShare, sw);
    dShare = sh.d;
    rShare = sh.r;
    oShare = sh.o;
  } else {
    voters = base.total;
  }
  const bullet =
    (opts.view === "scenario" ? opts.scenario.bullet : opts.baselineDefaults.bullet) /
    100;
  const intraD =
    (opts.view === "scenario" ? opts.scenario.intraD : opts.baselineDefaults.intraD) /
    100;
  const intraR =
    (opts.view === "scenario" ? opts.scenario.intraR : opts.baselineDefaults.intraR) /
    100;
  const candVotes = voters * (2 - bullet);
  const dCand = dShare * candVotes;
  const rCand = rShare * candVotes;
  const oCand = oShare * candVotes;
  return {
    d1: dCand * intraD,
    d2: dCand * (1 - intraD),
    r1: rCand * intraR,
    r2: rCand * (1 - intraR),
    o: oCand,
    d_total: dCand,
    r_total: rCand,
    total: candVotes,
    voters,
    d_share: dShare,
    r_share: rShare,
    o_share: oShare,
  };
}

function computeAsm(
  feat: PrecinctFeature,
  opts: ComputeOptions,
): AsmPrecinctResult {
  const byMode = {
    ed: asmSliceFor(feat, "ed", opts),
    early: asmSliceFor(feat, "early", opts),
    vbm: asmSliceFor(feat, "vbm", opts),
  };
  const agg = (k: keyof AsmModeOut): number =>
    Number(byMode.ed[k]) + Number(byMode.early[k]) + Number(byMode.vbm[k]);
  const total = {
    d1: agg("d1"),
    d2: agg("d2"),
    r1: agg("r1"),
    r2: agg("r2"),
    o: agg("o"),
    d_total: agg("d_total"),
    r_total: agg("r_total"),
    total: agg("total"),
    voters: agg("voters"),
  };
  let baselineTotal = total;
  if (opts.view === "scenario") {
    const baseOpts: ComputeOptions = { ...opts, view: "baseline" };
    const baseModes = {
      ed: asmSliceFor(feat, "ed", baseOpts),
      early: asmSliceFor(feat, "early", baseOpts),
      vbm: asmSliceFor(feat, "vbm", baseOpts),
    };
    const bagg = (k: keyof AsmModeOut) =>
      Number(baseModes.ed[k]) +
      Number(baseModes.early[k]) +
      Number(baseModes.vbm[k]);
    baselineTotal = {
      d1: bagg("d1"),
      d2: bagg("d2"),
      r1: bagg("r1"),
      r2: bagg("r2"),
      o: bagg("o"),
      d_total: bagg("d_total"),
      r_total: bagg("r_total"),
      total: bagg("total"),
      voters: bagg("voters"),
    };
  }
  return { byMode, total, baselineTotal };
}

// ============================ Public API ============================

export function computePrecinct(
  feat: PrecinctFeature,
  opts: ComputeOptions,
): PrecinctResult {
  return {
    feature: feat,
    sen: computeSen(feat, opts),
    asm: computeAsm(feat, opts),
  };
}

export function computeAll(
  fc: PrecinctCollection,
  opts: ComputeOptions,
): PrecinctResult[] {
  return fc.features.map((f) => computePrecinct(f, opts));
}

export function marginPct(slice: { d: number; r: number; total: number }): number {
  return slice.total > 0 ? ((slice.d - slice.r) / slice.total) * 100 : 0;
}

export function asmTicketMarginPct(slice: {
  d_total: number;
  r_total: number;
  total: number;
}): number {
  return slice.total > 0 ? ((slice.d_total - slice.r_total) / slice.total) * 100 : 0;
}

export function asmOutcome(slice: {
  d1: number;
  d2: number;
  r1: number;
  r2: number;
  o: number;
}): { code: "2D" | "1D1R-D" | "1D1R-R" | "2R"; top2: { name: string; v: number; party: "D" | "R" | "O" }[] } {
  const cands = [
    { name: "d1", v: slice.d1, party: "D" as const },
    { name: "d2", v: slice.d2, party: "D" as const },
    { name: "r1", v: slice.r1, party: "R" as const },
    { name: "r2", v: slice.r2, party: "R" as const },
    { name: "o", v: slice.o, party: "O" as const },
  ];
  cands.sort((a, b) => b.v - a.v);
  const top2 = cands.slice(0, 2);
  const ds = top2.filter((c) => c.party === "D").length;
  const rs = top2.filter((c) => c.party === "R").length;
  if (ds === 2) return { code: "2D", top2 };
  if (rs === 2) return { code: "2R", top2 };
  return { code: top2[0].party === "D" ? "1D1R-D" : "1D1R-R", top2 };
}

export function activeSenSlice(
  result: PrecinctResult,
  mode: ScenarioState["mode"],
): ModeSlice {
  if (mode === "total") return result.sen.total;
  return result.sen.byMode[mode];
}

export function activeAsmSlice(
  result: PrecinctResult,
  mode: ScenarioState["mode"],
): AsmPrecinctResult["total"] {
  if (mode === "total") return result.asm.total;
  // byMode entries are AsmModeOut (a superset of total's shape); cast is safe.
  const m = result.asm.byMode[mode];
  return {
    d1: m.d1,
    d2: m.d2,
    r1: m.r1,
    r2: m.r2,
    o: m.o,
    d_total: m.d_total,
    r_total: m.r_total,
    total: m.total,
    voters: m.voters,
  };
}

export function activeBaselineSenSlice(
  result: PrecinctResult,
  mode: ScenarioState["mode"],
): ModeSlice {
  // For mode-specific deltas we need the baseline at that mode. Since
  // baselineTotal is the aggregate, we recompute via the data file when
  // mode != total. Callers in v2 mostly compare totals; the precinct
  // table uses .total deltas.
  if (mode === "total") return result.sen.baselineTotal;
  return result.feature.properties.sen27_modes[mode];
}
