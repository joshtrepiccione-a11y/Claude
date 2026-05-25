import { PROV_DESCRIPTIONS } from "../../model/dataConfidence";

export function DataNotes() {
  return (
    <section className="panel data-notes">
      <h2>Data Notes &amp; Assumptions</h2>
      <details>
        <summary>Where the numbers come from</summary>
        <div className="note-body">
          <p>
            <span className="badge calibrated">Calibrated</span> District-aggregate Senate
            and Assembly results are taken verbatim from NJ Division of Elections
            certified totals. Per-precinct distribution is interpolated from 2024
            presidential vote shares via a uniform district-wide shift plus
            scaling pass, so district sums match certified targets exactly.
          </p>
          <p>
            <strong>Senate baseline:</strong> 2023 LD8 result — Tiver (R) 28,013 vs
            Burton (D) 26,648. Effective shift vs. presidential: −1.62 pts.
          </p>
          <p>
            <strong>Assembly baseline:</strong> 2025 LD8 result — Angelozzi (D) 50,168 /
            Katz (D) 50,036 / Torrissi (R) 46,262 / Umba (R) 44,300. Effective shift
            vs. presidential: +5.93 pts D.
          </p>
        </div>
      </details>
      <details>
        <summary>Confidence taxonomy</summary>
        <div className="note-body">
          {(Object.keys(PROV_DESCRIPTIONS) as Array<keyof typeof PROV_DESCRIPTIONS>).map(
            (k) => (
              <p key={k}>
                <strong>{k}:</strong> {PROV_DESCRIPTIONS[k]}
              </p>
            ),
          )}
        </div>
      </details>
      <details>
        <summary>Modeling assumptions</summary>
        <div className="note-body">
          <p>
            <strong>Mode mix overlay:</strong> ED 55% / EV 15% / VBM 30% (statewide
            average for NJ). Partisan shift by mode: ED −8 / EV +4 / VBM +12 pts
            relative to overall margin.
          </p>
          <p>
            <strong>Half-shift logic:</strong> a swing of X points moves X/200 share
            from one party to the other, with the Other-party share preserved and
            three shares renormalized.
          </p>
          <p>
            <strong>Assembly mechanics:</strong> total candidate-votes = voters × (2 −
            bullet rate). Default bullet rate 5% (2025 calibration). Intra-party
            splits: Angelozzi 50.07% of D ticket; Torrissi 51.08% of R ticket
            (2025 calibration). Sen→Asm coattail defaults to 0 (each race
            independent).
          </p>
        </div>
      </details>
      <details>
        <summary>Known limitations</summary>
        <div className="note-body">
          <p>
            Per-precinct distribution is not certified — it's interpolated. A
            precinct's modeled margin may differ from its actual certified
            margin by a few points. Treat precinct rankings as directional, not
            exact.
          </p>
          <p>
            Voter-file and demographic overlays are <strong>not yet integrated</strong>.
            Strategic scoring uses vote-volume and modeled-swing signals only;
            "turnout gap" and "candidate overperformance" inputs will improve
            once voter file is added.
          </p>
          <p>
            The Path to Victory module standardizes interventions at +3 pts per
            (muni × mode). The plausibility indicator is heuristic, not a
            predictive forecast — use it as a relative comparison, not an
            absolute probability.
          </p>
          <p>
            Mode breakdowns (ED/EV/VBM) are modeled, not certified per-precinct.
            They use a statewide mix overlay and may not reflect precinct-level
            variation in voting behavior.
          </p>
        </div>
      </details>
      <details>
        <summary>How to improve the data</summary>
        <div className="note-body">
          <p>
            Drop certified per-precinct results into{" "}
            <code>data/ld8_real_baselines.json</code> and re-run{" "}
            <code>scripts/build_ld8.py</code>. Precincts with overrides will
            display the <span className="badge real">Real</span> badge instead of{" "}
            <span className="badge calibrated">Calibrated</span>.
          </p>
        </div>
      </details>
    </section>
  );
}
