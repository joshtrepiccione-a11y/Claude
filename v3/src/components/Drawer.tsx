import type { PrecinctRow } from "../lib/data/types";
import { CANDIDATES } from "../lib/data/config";
import { Card, Pill, fmtNumber, fmtMargin, fmtSigned } from "./UI";

export function PrecinctDrawer({
  row,
  onClose,
}: {
  row: PrecinctRow | null;
  onClose: () => void;
}) {
  if (!row) {
    return (
      <Card title="Precinct detail" subtitle="Click a precinct on the map">
        <div className="text-sm text-slate-500 py-6 text-center">
          Select a precinct to inspect its baseline, scenario projection, vote-mode
          breakdown, and recommended action.
        </div>
      </Card>
    );
  }
  const p = row.baseline;
  const s = row.scenario;
  return (
    <Card
      title={p.precinctName}
      subtitle={`${p.municipality} · ${p.county}`}
      right={
        <button
          aria-label="close detail"
          onClick={onClose}
          className="text-slate-400 hover:text-slate-700 text-lg leading-none"
        >
          ×
        </button>
      }
    >
      <div className="space-y-3 text-sm">
        <div className="flex items-center gap-2 flex-wrap">
          <Pill tone="navy">{row.category}</Pill>
          <Pill tone="amber">{row.action}</Pill>
          <Pill tone="slate">{p.baselineConfidence}</Pill>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Box label="Baseline margin" value={fmtMargin(row.baselineSlateMarginPct)} />
          <Box label="Scenario margin" value={fmtMargin(row.scenarioSlateMarginPct)} />
          <Box label="Baseline turnout" value={fmtNumber(p.baselineTurnout)} />
          <Box label="Scenario turnout" value={fmtNumber(s.turnout)} />
          <Box label="Net D vote swing" value={fmtSigned(row.netVoteSwingD)} />
          <Box label="Vote mode focus" value={modeLabel(row.voteModePriority)} />
        </div>

        <div>
          <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">
            Baseline candidate votes
          </div>
          <CandidateRow label={CANDIDATES[0].label} v={p.demA} party="D" />
          <CandidateRow label={CANDIDATES[1].label} v={p.demB} party="D" />
          <CandidateRow label={CANDIDATES[2].label} v={p.repA} party="R" />
          <CandidateRow label={CANDIDATES[3].label} v={p.repB} party="R" />
        </div>

        <div>
          <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">
            Scenario candidate votes
          </div>
          <CandidateRow label={CANDIDATES[0].label} v={s.demA} party="D" />
          <CandidateRow label={CANDIDATES[1].label} v={s.demB} party="D" />
          <CandidateRow label={CANDIDATES[2].label} v={s.repA} party="R" />
          <CandidateRow label={CANDIDATES[3].label} v={s.repB} party="R" />
        </div>

        <div>
          <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">
            Vote mode breakdown (baseline turnout)
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <ModeBox label="Election Day" v={p.modeTurnout.ed} />
            <ModeBox label="Early Vote" v={p.modeTurnout.early} />
            <ModeBox label="Vote by Mail" v={p.modeTurnout.vbm} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Box label="Persuasion score" value={Math.round(row.persuasionScore)} />
          <Box label="VBM score" value={Math.round(row.vbmScore)} />
          <Box label="Early vote score" value={Math.round(row.earlyScore)} />
          <Box label="Election Day score" value={Math.round(row.edScore)} />
        </div>

        <div className="text-[11px] text-slate-500 italic pt-1">
          Data confidence: <strong>{p.baselineConfidence}</strong>. Scenario figures are modeled, not predictions.
        </div>
      </div>
    </Card>
  );
}

function Box({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="bg-slate-50 rounded-md px-3 py-2 border border-slate-100">
      <div className="text-[10px] uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="text-sm font-semibold text-slate-800 mt-0.5">{value}</div>
    </div>
  );
}

function CandidateRow({
  label,
  v,
  party,
}: {
  label: string;
  v: number;
  party: "D" | "R";
}) {
  return (
    <div className="flex items-center justify-between text-sm py-0.5">
      <span className="text-slate-700">{label}</span>
      <span className={party === "D" ? "text-blue-700 font-medium" : "text-red-700 font-medium"}>
        {fmtNumber(v)}
      </span>
    </div>
  );
}

function ModeBox({ label, v }: { label: string; v: number }) {
  return (
    <div className="bg-white border border-slate-200 rounded px-2 py-1.5 text-center">
      <div className="text-[10px] text-slate-500">{label}</div>
      <div className="text-sm font-semibold text-slate-800">{fmtNumber(v)}</div>
    </div>
  );
}

function modeLabel(m: "ed" | "early" | "vbm") {
  return m === "vbm" ? "Vote by Mail" : m === "early" ? "Early Vote" : "Election Day";
}
