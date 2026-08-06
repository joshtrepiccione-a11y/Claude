import { useApp, type TabId } from "../state/store";
import type { BoeData } from "../lib/data/types";

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: "turnaround", label: "Turnaround", icon: "◔" },
  { id: "map", label: "Map", icon: "◰" },
  { id: "results", label: "Results", icon: "≣" },
  { id: "about", label: "About", icon: "◇" },
];

/** Ascending-bars mark — measurement, not a party symbol. */
function Mark() {
  return (
    <svg viewBox="0 0 64 64" className="w-8 h-8 shrink-0" aria-hidden="true">
      <rect width="64" height="64" rx="12" fill="#4a3aa7" />
      <path d="M14 40h8v10h-8zM28 30h8v20h-8zM42 18h8v32h-8z" fill="#ffffff" />
      <path
        d="M12 15l10 6 10-6"
        fill="none"
        stroke="#ffffff"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity=".75"
      />
    </svg>
  );
}

export function Nav({ data }: { data: BoeData }) {
  const { state, dispatch } = useApp();
  const candidates = data.meta.allCandidates.filter(
    (c) => !/write[\s-]*in|personal\s+choice/i.test(c),
  );

  return (
    <>
      <header className="bg-ink-900 text-white sticky top-0 z-30 shadow">
        <div className="max-w-[1500px] mx-auto px-4 py-2 flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 mr-2 min-w-0 shrink">
            <Mark />
            <div className="leading-tight min-w-0">
              <div className="font-semibold text-sm tracking-tight">
                Hammonton School Board — Pullia Vote Patterns
              </div>
              <div className="text-[11px] text-ink-200">
                2021 → 2023 · Certified results, measured not modeled
              </div>
            </div>
          </div>

          <nav
            className="hidden md:flex items-center gap-1 grow"
            aria-label="Primary"
          >
            {TABS.map((t) => {
              const active = state.tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => dispatch({ type: "setTab", tab: t.id })}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                    active
                      ? "bg-white text-ink-900"
                      : "text-ink-100 hover:bg-ink-800"
                  }`}
                  aria-current={active ? "page" : undefined}
                >
                  {t.label}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-2 shrink-0 grow md:grow-0 justify-end">
            <label className="text-xs text-ink-200" htmlFor="focus-select">
              Focus
            </label>
            <select
              id="focus-select"
              value={state.focus ?? ""}
              onChange={(e) => dispatch({ type: "setFocus", focus: e.target.value })}
              className="bg-ink-800 text-white text-sm rounded-md border border-ink-700 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-focus-ring max-w-[190px]"
            >
              {candidates.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      {/* Mobile bottom tab bar */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-ink-900 border-t border-ink-700 grid grid-cols-4"
        aria-label="Primary mobile"
      >
        {TABS.map((t) => {
          const active = state.tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => dispatch({ type: "setTab", tab: t.id })}
              className={`flex flex-col items-center justify-center py-2 min-h-[56px] text-[10px] font-medium ${
                active ? "text-white" : "text-ink-300"
              }`}
              aria-current={active ? "page" : undefined}
            >
              <span className="text-base leading-none mb-0.5" aria-hidden="true">
                {t.icon}
              </span>
              {t.label}
            </button>
          );
        })}
      </nav>
    </>
  );
}
