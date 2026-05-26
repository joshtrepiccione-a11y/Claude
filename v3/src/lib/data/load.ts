// Load and normalise the LD8 precinct GeoJSON into V3's domain types.
// The 2027 ballot is Senate + Assembly, so we load both race blocks.

import type { PrecinctBaseline } from "./types";
import { isLD8Municipality } from "./config";

export interface LoadedData {
  precincts: PrecinctBaseline[];
  geojson: GeoJSON.FeatureCollection;
  warnings: string[];
}

interface ModeSlice {
  d: number;
  r: number;
  o: number;
  total: number;
}

// Upstream GeoJSON property shape we care about.
interface UpstreamProps {
  county: string;
  precinct: string;
  municipality: string;

  // Assembly baseline
  assem27_baseline_d: number;
  assem27_baseline_r: number;
  assem27_baseline_other: number;
  assem27_baseline_voters: number;
  assem25_d1: number;
  assem25_d2: number;
  assem25_r1: number;
  assem25_r2: number;
  assem27_modes: { ed: ModeSlice; early: ModeSlice; vbm: ModeSlice };

  // Senate baseline
  sen27_baseline_d: number;
  sen27_baseline_r: number;
  sen27_baseline_other: number;
  sen27_baseline_total: number;
  sen27_modes: { ed: ModeSlice; early: ModeSlice; vbm: ModeSlice };

  baseline_source?: { asm: string; sen: string };
}

const DATA_URL = new URL("./data/ld8_precincts.geojson", document.baseURI).toString();

export async function loadLD8(): Promise<LoadedData> {
  const res = await fetch(DATA_URL);
  if (!res.ok) throw new Error(`Failed to load precinct data (${res.status})`);
  const fc = (await res.json()) as GeoJSON.FeatureCollection;

  const warnings: string[] = [];
  const precincts: PrecinctBaseline[] = [];

  for (const feat of fc.features) {
    const p = feat.properties as unknown as UpstreamProps;
    if (!p) continue;

    if (!isLD8Municipality(p.municipality)) {
      warnings.push(
        `Precinct "${p.precinct}" has municipality "${p.municipality}" not in LD8 config — skipped.`,
      );
      continue;
    }

    // ── Assembly per-candidate split ───────────────────────────────
    // The upstream 2027 Assembly baseline gives slate totals only. We use
    // 2025 Assembly results (assem25_d1/d2, r1/r2) to estimate the intra-
    // slate split between Candidate A and Candidate B for each party.
    const d1Share = safeRatio(p.assem25_d1, p.assem25_d1 + p.assem25_d2, 0.5);
    const r1Share = safeRatio(p.assem25_r1, p.assem25_r1 + p.assem25_r2, 0.5);

    const dSlate = p.assem27_baseline_d || 0;
    const rSlate = p.assem27_baseline_r || 0;
    const ballotsAsm = p.assem27_baseline_voters || 0;

    const am = p.assem27_modes;
    const asmModeTurnout = { ed: am.ed.total, early: am.early.total, vbm: am.vbm.total };
    const asmModeDem = { ed: am.ed.d, early: am.early.d, vbm: am.vbm.d };
    const asmModeRep = { ed: am.ed.r, early: am.early.r, vbm: am.vbm.r };

    // ── Senate baseline ────────────────────────────────────────────
    const senD = p.sen27_baseline_d || 0;
    const senR = p.sen27_baseline_r || 0;
    const senOther = p.sen27_baseline_other || 0;
    const senTotal = p.sen27_baseline_total || senD + senR + senOther;

    const sm = p.sen27_modes;
    const senModeTurnout = { ed: sm.ed.total, early: sm.early.total, vbm: sm.vbm.total };
    const senModeDem = { ed: sm.ed.d, early: sm.early.d, vbm: sm.vbm.d };
    const senModeRep = { ed: sm.ed.r, early: sm.early.r, vbm: sm.vbm.r };

    const asmConfidence = coerceConfidence(p.baseline_source?.asm);
    const senConfidence = coerceConfidence(p.baseline_source?.sen);

    // Registered voters: the upstream GeoJSON does not carry a registration
    // count. Approximate it as 1.45 × Assembly ballot count and tag it as
    // Estimated so the UI can flag the source. Replace via voter-file import.
    const REG_MULTIPLIER = 1.45;

    precincts.push({
      precinctId: p.precinct,
      precinctName: p.precinct,
      municipality: p.municipality,
      county: p.county,

      registeredVoters: Math.max(ballotsAsm, senTotal) * REG_MULTIPLIER,
      registrationConfidence: "Estimated",

      // Assembly
      baselineTurnout: ballotsAsm,
      demA: dSlate * d1Share,
      demB: dSlate * (1 - d1Share),
      repA: rSlate * r1Share,
      repB: rSlate * (1 - r1Share),
      other: p.assem27_baseline_other || 0,
      modeTurnout: asmModeTurnout,
      modeDemSlate: asmModeDem,
      modeRepSlate: asmModeRep,
      baselineConfidence: asmConfidence,

      // Senate
      senTurnout: senTotal,
      senD,
      senR,
      senOther,
      senModeTurnout,
      senModeDem,
      senModeRep,
      senateBaselineConfidence: senConfidence,
    });
  }

  return { precincts, geojson: fc, warnings };
}

function coerceConfidence(upstream: string | undefined): PrecinctBaseline["baselineConfidence"] {
  const v = (upstream ?? "modeled").toLowerCase();
  if (v.includes("real")) return "Certified";
  if (v === "modeled") return "Modeled";
  if (v === "estimated" || v === "interpolated") return "Estimated";
  if (v === "calibrated") return "Derived";
  return "Modeled";
}

function safeRatio(a: number, b: number, fallback: number): number {
  if (!b || !isFinite(a / b)) return fallback;
  const r = a / b;
  if (r <= 0 || r >= 1) return fallback;
  return r;
}
