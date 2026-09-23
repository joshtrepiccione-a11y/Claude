import { wixEventsV2 } from "@wix/events";

export interface EventSummary {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  image: unknown;
  startDate: string;
  startTime: string;
  dateAndTime: string;
  startIso: string;
  timeZone: string;
  locationName: string;
  registrationType: "TICKETING" | "RSVP" | "EXTERNAL" | "NONE" | string;
  lowestPrice: string | null;
}

// Serialize only the fields the UI renders.
export function toEventSummary(e: any): EventSummary {
  return {
    id: e._id,
    slug: e.slug,
    title: e.title ?? "",
    shortDescription: e.shortDescription ?? "",
    image: e.mainImage ?? null,
    startDate: e.dateAndTimeSettings?.formatted?.startDate ?? "",
    startTime: e.dateAndTimeSettings?.formatted?.startTime ?? "",
    dateAndTime: e.dateAndTimeSettings?.formatted?.dateAndTime ?? "",
    startIso: e.dateAndTimeSettings?.startDate ? new Date(e.dateAndTimeSettings.startDate).toISOString() : "",
    timeZone: e.dateAndTimeSettings?.timeZoneId ?? "America/Chicago",
    locationName: e.location?.name ?? "",
    registrationType: e.registration?.initialType ?? e.registration?.type ?? "NONE",
    lowestPrice: e.registration?.tickets?.lowestPrice?.formattedValue ?? null,
  };
}

/** Upcoming and in-progress events, soonest first. */
export async function getUpcomingEvents(limit = 50): Promise<EventSummary[]> {
  const res = await wixEventsV2.queryEvents(
    {
      filter: { status: { $in: ["UPCOMING", "STARTED"] } },
      sort: [{ fieldName: "dateAndTimeSettings.startDate", order: "ASC" }],
      paging: { limit },
    },
    { fields: ["DETAILS", "TEXTS", "REGISTRATION", "URLS"] },
  );
  return (res.events ?? []).map(toEventSummary);
}
