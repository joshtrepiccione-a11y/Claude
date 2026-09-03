import type { Metadata } from "next";
import Link from "next/link";
import { PublicShell } from "@/components/PublicShell";
import { EventCard } from "@/components/EventCard";
import { listCategories } from "@/lib/categories";
import { listEventsInMonth, listPastEvents, listUpcomingEvents, type Event } from "@/lib/events";
import { monthGrid, monthLabel, parseMonthParam, utcToLocalDate } from "@/lib/time";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Events",
  description: "Upcoming ceremonies, meetings, fundraisers, and community events at American Legion Post 186 in Hammonton, NJ.",
  alternates: { canonical: "/events" },
};

type Search = { view?: string; month?: string; category?: string };

function shiftMonth(year: number, month: number, delta: number): string {
  const d = new Date(Date.UTC(year, month - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export default async function EventsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const view = sp.view === "month" ? "month" : sp.view === "past" ? "past" : "list";
  const categories = await listCategories("event");
  const catMap = new Map(categories.map((c) => [c.slug, c.name]));
  const category = categories.some((c) => c.slug === sp.category) ? sp.category : undefined;
  const qs = (overrides: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const merged = { view, month: sp.month, category, ...overrides };
    for (const [k, v] of Object.entries(merged)) if (v) params.set(k, v);
    const s = params.toString();
    return s ? `/events?${s}` : "/events";
  };

  return (
    <PublicShell>
      <div className="container page-intro">
        <h1>Events</h1>
        <p className="lead">Ceremonies, meetings, fundraisers, and community gatherings at the Post and around Hammonton.</p>
      </div>
      <section className="section" style={{ paddingTop: "1rem" }}>
        <div className="container">
          <nav className="view-switch" aria-label="Event views">
            <Link href={qs({ view: undefined })} aria-current={view === "list" ? "true" : undefined}>
              Upcoming list
            </Link>
            <Link href={qs({ view: "month" })} aria-current={view === "month" ? "true" : undefined}>
              Month view
            </Link>
            <Link href={qs({ view: "past" })} aria-current={view === "past" ? "true" : undefined}>
              Past events
            </Link>
          </nav>

          <form method="get" action="/events" className="filter-form">
            {view !== "list" ? <input type="hidden" name="view" value={view} /> : null}
            {sp.month ? <input type="hidden" name="month" value={sp.month} /> : null}
            <div className="field">
              <label htmlFor="category">Filter by category</label>
              <select id="category" name="category" defaultValue={category ?? ""}>
                <option value="">All categories</option>
                {categories.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className="btn btn-outline btn-sm">
              Apply filter
            </button>
            {category ? (
              <Link href={qs({ category: undefined })} className="btn btn-quiet btn-sm">
                Clear
              </Link>
            ) : null}
          </form>

          {view === "list" ? <UpcomingList events={await listUpcomingEvents({ category, includeCancelled: true })} catMap={catMap} /> : null}
          {view === "past" ? <PastList events={await listPastEvents({ category, limit: 60 })} catMap={catMap} /> : null}
          {view === "month" ? <MonthView monthParam={sp.month} category={category} qs={qs} /> : null}
        </div>
      </section>
    </PublicShell>
  );
}

function UpcomingList({ events, catMap }: { events: Event[]; catMap: Map<string, string> }) {
  if (!events.length) {
    return <p className="lead">No upcoming public events are listed right now. Check the past events archive, or contact us to ask what is coming up.</p>;
  }
  return (
    <div className="grid grid-2">
      {events.map((e) => (
        <EventCard key={e.id} event={e} categoryLabel={catMap.get(e.category)} headingLevel={2} />
      ))}
    </div>
  );
}

function PastList({ events, catMap }: { events: Event[]; catMap: Map<string, string> }) {
  if (!events.length) return <p className="lead">No past events have been archived yet.</p>;
  return (
    <div className="grid grid-2">
      {events.map((e) => (
        <EventCard key={e.id} event={e} categoryLabel={catMap.get(e.category)} headingLevel={2} />
      ))}
    </div>
  );
}

async function MonthView({ monthParam, category, qs }: { monthParam?: string; category?: string; qs: (o: Record<string, string | undefined>) => string }) {
  const { year, month } = parseMonthParam(monthParam);
  const events = await listEventsInMonth(year, month, category);
  const grid = monthGrid(year, month);
  const todayKey = utcToLocalDate(new Date().toISOString());
  const byDay = new Map<string, Event[]>();
  for (const e of events) {
    // Place the event on each local day it spans, capped at 31 days.
    const start = utcToLocalDate(e.start_at);
    const end = utcToLocalDate(e.end_at);
    const cursor = new Date(`${start}T00:00:00Z`);
    for (let i = 0; i < 31; i += 1) {
      const key = cursor.toISOString().slice(0, 10);
      if (key > end) break;
      byDay.set(key, [...(byDay.get(key) ?? []), e]);
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
  }
  const label = monthLabel(year, month);

  return (
    <div>
      <div className="cal-nav">
        <Link href={qs({ view: "month", month: shiftMonth(year, month, -1) })} className="btn btn-outline btn-sm">
          <span aria-hidden="true">&larr;</span> Previous month
        </Link>
        <h2 aria-live="polite" style={{ fontSize: "var(--step-1)", margin: 0 }}>{label}</h2>
        <Link href={qs({ view: "month", month: shiftMonth(year, month, 1) })} className="btn btn-outline btn-sm">
          Next month <span aria-hidden="true">&rarr;</span>
        </Link>
      </div>
      <p className="calendar-hint">Scroll the calendar sideways to see the rest of the week, or use the upcoming list view.</p>
      <div className="calendar-wrap" tabIndex={0} role="region" aria-label={`Calendar for ${label}`}>
        <table className="calendar">
          <caption className="visually-hidden">Events in {label}</caption>
          <thead>
            <tr>
              {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((d) => (
                <th key={d} scope="col">
                  <span aria-hidden="true">{d.slice(0, 3)}</span>
                  <span className="visually-hidden">{d}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grid.map((week, wi) => (
              <tr key={wi}>
                {week.map((cell) => {
                  const dayEvents = byDay.get(cell.date) ?? [];
                  return (
                    <td key={cell.date} className={`${cell.inMonth ? "" : "outside"}${cell.date === todayKey ? " today" : ""}`}>
                      <span className="day-number">
                        {cell.day}
                        {cell.date === todayKey ? <span className="visually-hidden"> (today)</span> : null}
                      </span>
                      {dayEvents.length ? (
                        <ul>
                          {dayEvents.map((e) => (
                            <li key={e.id} className={e.status === "cancelled" ? "is-cancelled" : ""}>
                              <Link href={`/events/${e.slug}`}>
                                {e.title}
                                {e.status === "cancelled" ? <span className="visually-hidden"> (cancelled)</span> : null}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!events.length ? <p className="meta" style={{ marginTop: "1rem" }}>No public events in {label}.</p> : null}
    </div>
  );
}
