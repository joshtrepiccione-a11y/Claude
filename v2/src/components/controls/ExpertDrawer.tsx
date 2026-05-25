import { useStore } from "../../state/store";

type Props = {
  open: boolean;
  onClose: () => void;
  munis: string[];
};

const SHARE_BOUNDS: Record<"ed" | "ev" | "vbm", [number, number]> = {
  ed: [30, 80],
  ev: [0, 40],
  vbm: [0, 60],
};

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

export function ExpertDrawer({ open, onClose, munis }: Props) {
  const store = useStore();
  const s = store.scenario;
  const def = store.baselineDefaults;

  const setSenSwing = (k: "ed" | "ev" | "vbm", v: number) =>
    store.updateScenario({ senSwing: { ...s.senSwing, [k]: v } });
  const setAsmSwing = (k: "ed" | "ev" | "vbm", v: number) =>
    store.updateScenario({ asmSwing: { ...s.asmSwing, [k]: v } });

  // Coupled mode shares (same logic as v1)
  const adjustShare = (movedKey: "ed" | "ev" | "vbm", newVal: number) => {
    const [lo, hi] = SHARE_BOUNDS[movedKey];
    newVal = clamp(newVal, lo, hi);
    const next = { ...s.cwShare, [movedKey]: newVal };
    const others = (["ed", "ev", "vbm"] as const).filter((k) => k !== movedKey);
    const remaining = 100 - newVal;
    const oldSum = next[others[0]] + next[others[1]];
    if (oldSum > 0.0001) {
      next[others[0]] = (next[others[0]] / oldSum) * remaining;
      next[others[1]] = (next[others[1]] / oldSum) * remaining;
    } else {
      next[others[0]] = remaining / 2;
      next[others[1]] = remaining / 2;
    }
    for (const k of others) {
      const [olo, ohi] = SHARE_BOUNDS[k];
      next[k] = clamp(next[k], olo, ohi);
    }
    const sum = next.ed + next.ev + next.vbm;
    if (Math.abs(sum - 100) > 0.01 && sum > 0) {
      next.ed = (next.ed * 100) / sum;
      next.ev = (next.ev * 100) / sum;
      next.vbm = (next.vbm * 100) / sum;
    }
    next[movedKey] = clamp(next[movedKey], lo, hi);
    store.updateScenario({ cwShare: next });
  };

  const setMuniOverride = (
    muni: string,
    race: "sen" | "asm",
    k: "ed" | "ev" | "vbm",
    v: number,
  ) => {
    const existing = s.muniOverrides[muni] ?? {
      sen: { ed: 0, ev: 0, vbm: 0 },
      asm: { ed: 0, ev: 0, vbm: 0 },
    };
    const next = { ...existing, [race]: { ...existing[race], [k]: v } };
    store.updateScenario({
      muniOverrides: { ...s.muniOverrides, [muni]: next },
    });
  };

  const reset = () => store.resetScenario();

  return (
    <aside
      className={`expert-drawer ${open ? "open" : ""}`}
      aria-hidden={!open}
      aria-label="Expert scenario controls"
    >
      <button className="close-btn" onClick={onClose} aria-label="Close drawer">
        ×
      </button>
      <h2>Senate D−R Swing</h2>
      <div className="fieldset">
        {(["ed", "ev", "vbm"] as const).map((k) => (
          <div className="slider-row" key={`sen-${k}`}>
            <label>{k.toUpperCase()}</label>
            <input
              type="range"
              min={-15}
              max={15}
              step={0.5}
              value={s.senSwing[k]}
              onChange={(e) => setSenSwing(k, +e.target.value)}
            />
            <span className="val">
              {s.senSwing[k] >= 0 ? "+" : ""}
              {s.senSwing[k].toFixed(1)}
            </span>
          </div>
        ))}
      </div>

      <h2>Assembly D−R Swing</h2>
      <div className="fieldset">
        {(["ed", "ev", "vbm"] as const).map((k) => (
          <div className="slider-row" key={`asm-${k}`}>
            <label>{k.toUpperCase()}</label>
            <input
              type="range"
              min={-15}
              max={15}
              step={0.5}
              value={s.asmSwing[k]}
              onChange={(e) => setAsmSwing(k, +e.target.value)}
            />
            <span className="val">
              {s.asmSwing[k] >= 0 ? "+" : ""}
              {s.asmSwing[k].toFixed(1)}
            </span>
          </div>
        ))}
      </div>

      <h2>Turnout Mix (coupled)</h2>
      <div className="fieldset">
        {(["ed", "ev", "vbm"] as const).map((k) => (
          <div className="slider-row" key={`share-${k}`}>
            <label>{k.toUpperCase()} share</label>
            <input
              type="range"
              min={SHARE_BOUNDS[k][0]}
              max={SHARE_BOUNDS[k][1]}
              step={0.5}
              value={s.cwShare[k]}
              onChange={(e) => adjustShare(k, +e.target.value)}
            />
            <span className="val">{s.cwShare[k].toFixed(1)}%</span>
          </div>
        ))}
        <p className="muted tiny" style={{ marginTop: 6 }}>
          Three shares forced to sum to 100%. Drag one; the others adjust.
        </p>
      </div>

      <h2>Assembly Mechanics</h2>
      <div className="fieldset">
        <div className="slider-row">
          <label>Bullet rate</label>
          <input
            type="range"
            min={0}
            max={30}
            step={0.5}
            value={s.bullet}
            onChange={(e) => store.updateScenario({ bullet: +e.target.value })}
          />
          <span className="val">{s.bullet.toFixed(1)}%</span>
        </div>
        <div className="slider-row">
          <label>D1 (Angelozzi) %</label>
          <input
            type="range"
            min={30}
            max={70}
            step={0.1}
            value={s.intraD}
            onChange={(e) => store.updateScenario({ intraD: +e.target.value })}
          />
          <span className="val">{s.intraD.toFixed(1)}%</span>
        </div>
        <div className="slider-row">
          <label>R1 %</label>
          <input
            type="range"
            min={30}
            max={70}
            step={0.1}
            value={s.intraR}
            onChange={(e) => store.updateScenario({ intraR: +e.target.value })}
          />
          <span className="val">{s.intraR.toFixed(1)}%</span>
        </div>
        <div className="slider-row">
          <label>Sen→Asm coattail</label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={s.coattail}
            onChange={(e) => store.updateScenario({ coattail: +e.target.value })}
          />
          <span className="val">{s.coattail.toFixed(2)}</span>
        </div>
        <p className="muted tiny" style={{ marginTop: 4 }}>
          Defaults from 2025 calibration: bullet {def.bullet}%, intraD{" "}
          {def.intraD}%, intraR {def.intraR}%.
        </p>
      </div>

      <h2>Per-municipality overrides</h2>
      <details>
        <summary style={{ cursor: "pointer", color: "var(--muted)", fontSize: 12, padding: "6px 0" }}>
          Show all {munis.length} munis (collapsed by default)
        </summary>
        <div style={{ marginTop: 8 }}>
          {munis.map((muni) => {
            const o = s.muniOverrides[muni] ?? {
              sen: { ed: 0, ev: 0, vbm: 0 },
              asm: { ed: 0, ev: 0, vbm: 0 },
            };
            const touched =
              [o.sen.ed, o.sen.ev, o.sen.vbm, o.asm.ed, o.asm.ev, o.asm.vbm].some((v) => v !== 0);
            return (
              <div
                key={muni}
                style={{
                  background: "#0d1117",
                  border: `1px solid ${touched ? "var(--scenario)" : "var(--border)"}`,
                  borderRadius: 6,
                  padding: 8,
                  marginBottom: 6,
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{muni}</div>
                {(["sen", "asm"] as const).map((race) => (
                  <div key={race}>
                    <div className="muted tiny" style={{ marginTop: 4 }}>
                      {race === "sen" ? "Senate swing" : "Assembly swing"}
                    </div>
                    {(["ed", "ev", "vbm"] as const).map((k) => (
                      <div
                        className="slider-row"
                        key={k}
                        style={{ gridTemplateColumns: "28px 1fr 40px" }}
                      >
                        <label>{k.toUpperCase()}</label>
                        <input
                          type="range"
                          min={-20}
                          max={20}
                          step={0.5}
                          value={o[race][k]}
                          onChange={(e) =>
                            setMuniOverride(muni, race, k, +e.target.value)
                          }
                        />
                        <span className="val">
                          {o[race][k] >= 0 ? "+" : ""}
                          {o[race][k].toFixed(1)}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </details>

      <button
        onClick={reset}
        style={{
          marginTop: 12,
          background: "transparent",
          color: "var(--text)",
          border: "1px solid var(--border)",
          padding: "8px 12px",
          borderRadius: 6,
          width: "100%",
          cursor: "pointer",
        }}
      >
        Reset all scenario sliders
      </button>
    </aside>
  );
}
