// URL <-> store sync. Backward-compatible with v1 hash keys:
//   mode, metric, race, view, sen_sw, asm_sw, sh, b, id, ir, co, mu
// v2 adds: ui, layer, preset

import type { AppState, MapLayerKey } from "./store";
import type { ModeTriplet, RaceKey, UiMode, ViewKey } from "../data/types";

const V1_TO_V2_LAYER: Record<string, MapLayerKey> = {
  sen_margin: "sen_margin",
  asm_margin: "asm_margin",
  asm_outcome: "asm_outcome",
  turnout: "turnout",
};

const URL_MODE = { ed: "ed", early: "ev", vbm: "vbm" } as const;
const MODE_FROM_URL: Record<string, "ed" | "early" | "vbm"> = {
  ed: "ed",
  ev: "early",
  vbm: "vbm",
};

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

function parseTriplet(s: string | null, lo: number, hi: number): ModeTriplet | null {
  if (!s) return null;
  const parts = s.split(",").map(Number);
  if (parts.length !== 3 || !parts.every(Number.isFinite)) return null;
  return {
    ed: clamp(parts[0], lo, hi),
    ev: clamp(parts[1], lo, hi),
    vbm: clamp(parts[2], lo, hi),
  };
}

export function readUrl(): Partial<AppState> {
  const params = new URLSearchParams(location.hash.slice(1));
  const out: Partial<AppState> = {};
  const ui = params.get("ui");
  if (ui === "candidate" || ui === "expert") out.uiMode = ui as UiMode;
  const view = params.get("view");
  if (view === "scenario") out.view = "scenario" as ViewKey;
  const race = params.get("race");
  if (race === "sen" || race === "asm") out.raceFocus = race as RaceKey;
  const layer = params.get("layer") ?? params.get("metric");
  if (layer) {
    const mapped = V1_TO_V2_LAYER[layer] ?? layer;
    if (
      mapped === "sen_margin" ||
      mapped === "asm_margin" ||
      mapped === "asm_outcome" ||
      mapped === "turnout" ||
      mapped === "net_change" ||
      mapped === "strategic_priority"
    ) {
      out.mapLayer = mapped;
    }
  }
  return out;
}

export function readScenarioFromUrl(
  baseScenario: AppState["scenario"],
): AppState["scenario"] {
  const params = new URLSearchParams(location.hash.slice(1));
  const s = { ...baseScenario };
  const m = params.get("mode");
  if (m === "total") s.mode = "total";
  else if (m && MODE_FROM_URL[m]) s.mode = MODE_FROM_URL[m];
  const sen = parseTriplet(params.get("sen_sw"), -15, 15);
  if (sen) s.senSwing = sen;
  const asm = parseTriplet(params.get("asm_sw"), -15, 15);
  if (asm) s.asmSwing = asm;
  const sh = parseTriplet(params.get("sh"), 0, 100);
  if (sh) s.cwShare = sh;
  const num = (k: string, lo: number, hi: number) => {
    const v = +(params.get(k) ?? "");
    return Number.isFinite(v) ? clamp(v, lo, hi) : undefined;
  };
  const b = num("b", 0, 30);
  if (b !== undefined) s.bullet = b;
  const id = num("id", 30, 70);
  if (id !== undefined) s.intraD = id;
  const ir = num("ir", 30, 70);
  if (ir !== undefined) s.intraR = ir;
  const co = num("co", 0, 1);
  if (co !== undefined) s.coattail = co;
  return s;
}

export function readMuniOverridesFromUrl(
  munis: string[],
): AppState["scenario"]["muniOverrides"] {
  const out: AppState["scenario"]["muniOverrides"] = {};
  const params = new URLSearchParams(location.hash.slice(1));
  const mu = params.get("mu");
  if (!mu) return out;
  for (const item of mu.split(";")) {
    if (!item) continue;
    const m = item.match(/^(\d+):(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)$/);
    if (!m) continue;
    const idx = +m[1];
    if (idx < 0 || idx >= munis.length) continue;
    out[munis[idx]] = {
      sen: {
        ed: clamp(+m[2], -20, 20),
        ev: clamp(+m[3], -20, 20),
        vbm: clamp(+m[4], -20, 20),
      },
      asm: {
        ed: clamp(+m[5], -20, 20),
        ev: clamp(+m[6], -20, 20),
        vbm: clamp(+m[7], -20, 20),
      },
    };
  }
  return out;
}

function fmtNum(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
}

export function writeUrl(state: AppState, munis: string[]): void {
  const p = new URLSearchParams();
  if (state.uiMode !== "candidate") p.set("ui", state.uiMode);
  if (state.mapLayer !== "strategic_priority") p.set("layer", state.mapLayer);
  if (state.raceFocus !== "sen") p.set("race", state.raceFocus);
  if (state.view !== "baseline") p.set("view", state.view);
  const s = state.scenario;
  if (s.mode !== "total") p.set("mode", URL_MODE[s.mode]);
  const tripletDefault = (t: ModeTriplet, def: ModeTriplet) =>
    t.ed === def.ed && t.ev === def.ev && t.vbm === def.vbm;
  const zero = { ed: 0, ev: 0, vbm: 0 };
  if (!tripletDefault(s.senSwing, zero))
    p.set("sen_sw", [s.senSwing.ed, s.senSwing.ev, s.senSwing.vbm].map(fmtNum).join(","));
  if (!tripletDefault(s.asmSwing, zero))
    p.set("asm_sw", [s.asmSwing.ed, s.asmSwing.ev, s.asmSwing.vbm].map(fmtNum).join(","));
  const def = state.baselineDefaults;
  const approx = (a: number, b: number) => Math.abs(a - b) < 0.05;
  if (
    !(
      approx(s.cwShare.ed, def.cwShare.ed) &&
      approx(s.cwShare.ev, def.cwShare.ev) &&
      approx(s.cwShare.vbm, def.cwShare.vbm)
    )
  )
    p.set("sh", [s.cwShare.ed, s.cwShare.ev, s.cwShare.vbm].map(fmtNum).join(","));
  if (!approx(s.bullet, def.bullet)) p.set("b", fmtNum(s.bullet));
  if (!approx(s.intraD, def.intraD)) p.set("id", fmtNum(s.intraD));
  if (!approx(s.intraR, def.intraR)) p.set("ir", fmtNum(s.intraR));
  if (!approx(s.coattail, def.coattail)) p.set("co", fmtNum(s.coattail));
  const muParts: string[] = [];
  munis.forEach((name, idx) => {
    const o = s.muniOverrides[name];
    if (!o) return;
    const allZero = [o.sen.ed, o.sen.ev, o.sen.vbm, o.asm.ed, o.asm.ev, o.asm.vbm].every(
      (v) => v === 0,
    );
    if (allZero) return;
    muParts.push(
      `${idx}:${[o.sen.ed, o.sen.ev, o.sen.vbm, o.asm.ed, o.asm.ev, o.asm.vbm]
        .map(fmtNum)
        .join(",")}`,
    );
  });
  if (muParts.length) p.set("mu", muParts.join(";"));
  const h = p.toString();
  history.replaceState(null, "", h ? "#" + h : location.pathname);
}
