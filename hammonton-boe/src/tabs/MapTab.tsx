import { useMemo } from "react";
import type { BoeData, Mode, PrecinctFeature } from "../lib/data/types";
import { MODES, MODE_LABEL } from "../lib/data/types";
import {
  METRICS,
  METRIC_BY_ID,
  chronological,
  type MetricContext,
  type MetricId,
} from "../lib/data/mapLayers";
import { hasPrecinctMode } from "../lib/measures";
import { useApp } from "../state/store";
import { PrecinctMap } from "../components/PrecinctMap";
import { PrecinctDrawer } from "../components/Drawer";
import { Card, Legend, Segmented, Unavailable } from "../components/UI";

export function MapTab({
  data,
  focus,
  years,
}: {
  data: BoeData;
  focus: string;
  years: string[];
}) {
  const { state, dispatch } = useApp();
  const ctx: MetricContext = {
    data,
    focus,
    year: state.year,
    compareYear: state.compareYear,
    mode: state.mode,
  };
  const metric = METRIC_BY_ID[state.metric];
  const blocked = metric.availableFor(ctx);
  const [fromYear, toYear] = chronological(ctx);
  const metricTitle =
    metric.id === "change" ? `${fromYear} → ${toYear} change` : metric.label;
  // The map draws districts, so it must offer only modes that exist AT
  // district level. Town-wide availability would light up buttons whose every
  // metric then refuses to render.
  const modesHere = MODES.filter((m) => hasPrecinctMode(data, state.year, m));

  const selected = useMemo(
    () =>
      data.features.find((f) => f.properties.precinct === state.selectedPrecinct) ??
      null,
    [data.features, state.selectedPrecinct],
  );

  const colorOf = useMemo(
    () => (f: PrecinctFeature) =>
      blocked ? "#e2e8f0" : metric.colorFn(f, ctx),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [metric, blocked, state.year, state.compareYear, state.mode, focus, data],
  );
  const tooltipOf = useMemo(
    () => (f: PrecinctFeature) =>
      `${f.properties.districtLabel}: ${metric.valueLabel(f, ctx)}`,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [metric, state.year, state.compareYear, state.mode, focus, data],
  );

  return (
    <main className="max-w-[1500px] mx-auto p-4 space-y-4">
      <Card>
        <div className="flex flex-wrap gap-x-6 gap-y-3">
          <Control label="Year">
            <Segmented
              label="Year"
              value={state.year}
              options={years.map((y) => ({ id: y, label: y }))}
              onChange={(y) => {
                dispatch({ type: "setYear", year: y });
                const other = years.find((o) => o !== y);
                if (other) dispatch({ type: "setCompareYear", year: other });
                // The new year may not report the mode that is currently
                // selected. Leaving it set would strand the user on a mode
                // whose button is disabled — including its own.
                if (
                  state.mode !== "all" &&
                  !hasPrecinctMode(data, y, state.mode)
                ) {
                  dispatch({ type: "setMode", mode: "all" });
                }
              }}
            />
          </Control>
          <Control label="Vote mode">
            <Segmented
              label="Vote mode"
              value={state.mode}
              options={[
                { id: "all" as const, label: "All" },
                ...MODES.map((m) => ({
                  id: m,
                  label: MODE_LABEL[m],
                  disabledReason: modesHere.includes(m)
                    ? null
                    : `${state.year} ${MODE_LABEL[m]} votes are not reported per district, so they cannot be mapped. The Turnaround and Results tabs show the town-wide figures.`,
                })),
              ]}
              onChange={(m) => dispatch({ type: "setMode", mode: m as Mode | "all" })}
            />
          </Control>
          <Control label="Metric">
            <Segmented
              label="Metric"
              value={state.metric}
              options={METRICS.map((m) => ({
                id: m.id,
                label: m.shortLabel,
                disabledReason: m.availableFor(ctx),
              }))}
              onChange={(id) => dispatch({ type: "setMetric", metric: id as MetricId })}
            />
          </Control>
        </div>
        <p className="text-xs text-slate-600 mt-3">{metric.description}</p>
        {metric.id === "change" &&
          !data.meta.precinctComparability.directlyComparable && (
            <p className="mt-2 text-xs text-slate-600 bg-amber-50 border border-amber-100 rounded-md px-3 py-2 leading-snug">
              <strong>Read this map with care.</strong>{" "}
              {data.meta.precinctComparability.note}
            </p>
          )}
      </Card>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_380px] gap-4">
        <Card
          title={metricTitle}
          subtitle={`${
            metric.id === "change" ? `${fromYear} → ${toYear}` : state.year
          }${state.mode !== "all" ? ` · ${MODE_LABEL[state.mode]}` : ""} · ${focus}`}
        >
          {blocked ? (
            <Unavailable reason={blocked} />
          ) : (
            <>
              <div className="h-[420px] md:h-[560px]">
                <PrecinctMap
                  geojson={data.geojson}
                  colorOf={colorOf}
                  tooltipOf={tooltipOf}
                  selectedPrecinct={state.selectedPrecinct}
                  onSelect={(id) => dispatch({ type: "select", precinct: id })}
                  colorKey={`${state.metric}|${state.year}|${state.compareYear}|${state.mode}|${focus}`}
                />
              </div>
              <div className="mt-3">
                <Legend items={metric.legend(ctx)} />
              </div>
            </>
          )}
        </Card>

        <div className="lg:sticky lg:top-20 lg:self-start">
          <PrecinctDrawer
            data={data}
            feature={selected}
            focus={focus}
            year={state.year}
            compareYear={state.compareYear}
            onClose={() => dispatch({ type: "select", precinct: null })}
          />
        </div>
      </div>
    </main>
  );
}

function Control({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-slate-500 mb-1.5">
        {label}
      </div>
      {children}
    </div>
  );
}
