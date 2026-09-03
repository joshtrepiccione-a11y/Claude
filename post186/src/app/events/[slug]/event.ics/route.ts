import { getPublicEvent } from "@/lib/events";
import { buildIcs } from "@/lib/ics";
import { plainText } from "@/lib/markdown";
import { absoluteUrl } from "@/lib/site";
import { utcToLocalDate } from "@/lib/time";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const event = await getPublicEvent(slug);
  if (!event) return new Response("Not found", { status: 404 });
  const ics = buildIcs(
    {
      uid: `event-${event.id}@post186`,
      title: event.title,
      description: event.summary || plainText(event.description, 800),
      location: event.location || "101 French Street, Hammonton, NJ 08037",
      url: absoluteUrl(`/events/${event.slug}`),
      startIso: event.start_at,
      endIso: event.end_at,
      allDay: Boolean(event.all_day),
      status: event.status,
      updatedIso: event.updated_at,
    },
    {
      localDate: (iso, shift = 0) => {
        const d = new Date(`${utcToLocalDate(iso)}T00:00:00Z`);
        d.setUTCDate(d.getUTCDate() + shift);
        return d.toISOString().slice(0, 10).replace(/-/g, "");
      },
    },
  );
  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${event.slug}.ics"`,
      "Cache-Control": "no-store",
    },
  });
}
