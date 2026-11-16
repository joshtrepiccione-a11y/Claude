import { getFeedEvents, getSettings } from "@/lib/data";
import { buildCalendar } from "@/lib/ics";
import { fullPostName } from "@/lib/settings";
import { siteUrl } from "@/lib/site";

/**
 * The post calendar as an iCalendar feed.
 *   /events/calendar.ics              every published event (for subscribing)
 *   /events/calendar.ics?event=slug   a single event (for "add to calendar")
 */
export async function GET(request: Request) {
  const slug = new URL(request.url).searchParams.get("event");
  const [events, settings] = await Promise.all([getFeedEvents(), getSettings()]);

  const selected = slug ? events.filter((event) => event.slug === slug) : events;
  if (slug && !selected.length) {
    return new Response("Event not found", { status: 404 });
  }

  const body = buildCalendar(selected, {
    name: slug ? selected[0].title : `${fullPostName(settings)} Events`,
    baseUrl: siteUrl(),
  });

  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `${slug ? "attachment" : "inline"}; filename="${slug ?? "post-186-events"}.ics"`,
      "Cache-Control": "public, max-age=900",
    },
  });
}
