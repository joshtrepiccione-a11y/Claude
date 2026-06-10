import { useMemo } from "react";
import { Card, Button, Pill } from "../components/UI";
import type { CountyResult, PrecinctRow } from "../lib/data/types";
import { useApp } from "../state/store";
import { SCENARIO_BY_ID } from "../lib/scenarios/presets";
import { generateMemo } from "../lib/export/report";
import { CONTEST } from "../lib/data/config";

export function Report({
  rows,
  county,
}: {
  rows: PrecinctRow[];
  county: CountyResult;
}) {
  const { state } = useApp();
  const preset = state.scenarioId !== "custom" ? SCENARIO_BY_ID[state.scenarioId] : null;

  const memo = useMemo(
    () => generateMemo(preset ?? null, state.assumptions, county, rows),
    [preset, state.assumptions, county, rows],
  );

  const memoText = useMemo(
    () =>
      [
        `${CONTEST.displayName} — ${CONTEST.subtitle}`,
        `Scenario: ${memo.scenarioName}`,
        `Generated: ${new Date(memo.generatedAt).toLocaleString()}`,
        "",
        ...memo.sections.map((s) => `## ${s.title}\n${s.body}\n`),
        "",
        "Disclaimer: Outputs are modeled, not predictions. See the Data tab for methodology.",
      ].join("\n"),
    [memo],
  );

  function copyMemo() { navigator.clipboard?.writeText(memoText); }
  function shareLink() {
    navigator.clipboard?.writeText(window.location.href);
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-4 space-y-4">
      <div className="flex items-start justify-between flex-wrap gap-3 no-print">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-navy-900">
            Campaign Memo
          </h1>
          <p className="text-sm text-slate-600">
            Plain-English summary of the active scenario. Updates as you change scenarios.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="secondary" onClick={copyMemo}>Copy Memo</Button>
          <Button variant="secondary" onClick={shareLink}>Share Scenario Link</Button>
          <Button onClick={() => window.print()}>Export Report</Button>
        </div>
      </div>

      <Card className="print-page" title={CONTEST.displayName} subtitle={`${CONTEST.subtitle} · Scenario: ${memo.scenarioName}`} right={<Pill tone="amber">Modeled</Pill>}>
        <article className="prose prose-sm max-w-none">
          {memo.sections.map((s, i) => (
            <div key={s.title} className={i ? "mt-4" : ""}>
              <h3 className="text-sm font-semibold text-navy-900 mb-1">{s.title}</h3>
              <p className="text-sm text-slate-700 leading-relaxed">{s.body}</p>
            </div>
          ))}
        </article>
        <div className="text-[11px] text-slate-500 italic mt-6">
          Outputs are modeled, not predictions. See the Data tab for methodology and confidence labels.
        </div>
      </Card>
    </div>
  );
}
