// Domain types for the LD8 dashboard. Mirrors the GeoJSON schema
// produced by scripts/build_ld8.py at the repository root.

export type ModeKey = "ed" | "early" | "vbm";
export type RaceKey = "sen" | "asm";
export type ViewKey = "baseline" | "scenario";
export type UiMode = "candidate" | "expert";

export type ModeTriplet = { ed: number; ev: number; vbm: number };

export type ModeSlice = {
  d: number;
  r: number;
  o: number;
  total: number;
};

export type ProvenanceLabel =
  | "real"
  | "real-calibrated"
  | "calibrated"
  | "modeled"
  | "estimated"
  | "interpolated"
  | "user-adjusted"
  | "scenario";

export type Candidates = {
  sen_d: string;
  sen_r: string;
  asm_d1: string;
  asm_d2: string;
  asm_r1: string;
  asm_r2: string;
};

export type PrecinctProperties = {
  county: string;
  precinct: string;
  municipality: string;

  pres_harris: number;
  pres_trump: number;
  pres_other: number;
  pres_total: number;
  pres_margin_pct: number;

  sen23_d: number;
  sen23_r: number;
  sen23_other: number;
  sen23_total: number;

  assem25_d1: number;
  assem25_d2: number;
  assem25_r1: number;
  assem25_r2: number;
  assem25_other: number;
  assem25_total: number;
  assem25_voters: number;

  sen27_baseline_d: number;
  sen27_baseline_r: number;
  sen27_baseline_other: number;
  sen27_baseline_total: number;

  assem27_baseline_d: number;
  assem27_baseline_r: number;
  assem27_baseline_other: number;
  assem27_baseline_voters: number;

  sen27_modes: { ed: ModeSlice; early: ModeSlice; vbm: ModeSlice };
  assem27_modes: { ed: ModeSlice; early: ModeSlice; vbm: ModeSlice };

  mode_source: {
    sen: Record<ModeKey, ProvenanceLabel>;
    asm: Record<ModeKey, ProvenanceLabel>;
  };
  baseline_source: { sen: ProvenanceLabel; asm: ProvenanceLabel };

  calibration: {
    intra_d_d1: number;
    intra_r_r1: number;
    bullet_pct: number;
  };
};

export type PrecinctFeature = GeoJSON.Feature<
  GeoJSON.Polygon | GeoJSON.MultiPolygon,
  PrecinctProperties
>;

export type PrecinctCollection = GeoJSON.FeatureCollection<
  GeoJSON.Polygon | GeoJSON.MultiPolygon,
  PrecinctProperties
>;

// ===== Scenario state =====

export type MuniOverride = {
  sen: ModeTriplet;
  asm: ModeTriplet;
};

export type ScenarioState = {
  mode: "total" | ModeKey;
  senSwing: ModeTriplet;
  asmSwing: ModeTriplet;
  cwShare: ModeTriplet;
  bullet: number;     // percent
  intraD: number;     // percent, D1 share of D ticket
  intraR: number;     // percent
  coattail: number;   // 0..1
  muniOverrides: Record<string, MuniOverride>;
  activePreset?: string;
};

// ===== Scenario results =====

export type SenPrecinctResult = {
  byMode: Record<ModeKey, ModeSlice>;
  total: ModeSlice;
  baselineTotal: ModeSlice;
};

export type AsmCandidateBreakdown = {
  d1: number;
  d2: number;
  r1: number;
  r2: number;
  o: number;
};

export type AsmPrecinctResult = {
  byMode: Record<
    ModeKey,
    AsmCandidateBreakdown & {
      d_total: number;
      r_total: number;
      total: number;
      voters: number;
      d_share: number;
      r_share: number;
      o_share: number;
    }
  >;
  total: AsmCandidateBreakdown & {
    d_total: number;
    r_total: number;
    total: number;
    voters: number;
  };
  baselineTotal: AsmCandidateBreakdown & {
    d_total: number;
    r_total: number;
    total: number;
    voters: number;
  };
};

export type PrecinctResult = {
  feature: PrecinctFeature;
  sen: SenPrecinctResult;
  asm: AsmPrecinctResult;
};

// ===== Strategic scoring & recommendations =====

export type ActionTag =
  | "vbm_chase"
  | "ev_push"
  | "ed_turnout"
  | "persuasion_mail"
  | "door_knock"
  | "candidate_visit"
  | "digital_ad"
  | "base_turnout"
  | "low_priority"
  | "monitor_only"
  | "defensive_hold";

export type Recommendation = {
  primary: ActionTag;
  reasoning: string[];
  confidence: 1 | 2 | 3;
  leaningParty: "D" | "R" | "competitive";
};

export type PrecinctScore = {
  persuasion: number;
  baseTurnout: number;
  vbm: number;
  overall: number;
  recommendation: Recommendation;
};
