import { services, availabilityCalendar, bookings } from "@wix/bookings";
import { cartV2 } from "@wix/ecom";
import { redirects } from "@wix/redirects";
import { BOOKINGS_APP_ID } from "./constants";

export interface BookingData {
  name: string;
  email: string;
  phone: string;
  notes?: string;
  serviceName?: string;
  displayDate?: string;
  displayTime?: string;
}

export interface TimeSlot {
  time: string;
  display: string;
  available: boolean;
  entity: any;
}

// Simplified view of a Wix Bookings service, safe to pass from the server to the client.
export interface ServiceSummary {
  id: string;
  slug: string;
  name: string;
  tagLine: string;
  description: string;
  type: "APPOINTMENT" | "CLASS" | "COURSE" | string;
  durationMinutes: number | null;
  price: string | null;
  requiresPayment: boolean;
  image: unknown;
}

/** The visitor's IANA timezone (e.g. "America/Chicago"). */
export function getVisitorTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

function formatMoney(value: string | number, currency?: string | null): string {
  const amount = Number(value);
  if (!currency || Number.isNaN(amount)) return `${value}${currency ? ` ${currency}` : ""}`;
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
}

export async function getServices(): Promise<ServiceSummary[]> {
  const { items } = await services.queryServices().find();
  return (items as any[])
    .filter((service) => !service.hidden)
    .map((service) => {
      const rate = service.payment?.rateType;
      const fixedPrice = service.payment?.fixed?.price;
      const varied = service.payment?.varied;

      let price: string | null = null;
      if (rate === "NO_FEE") {
        price = "Free";
      } else if (fixedPrice?.value != null) {
        price = formatMoney(fixedPrice.value, fixedPrice.currency);
      } else if (varied?.defaultPrice?.value != null) {
        price = `From ${formatMoney(varied.defaultPrice.value, varied.defaultPrice.currency)}`;
      }

      return {
        id: service._id,
        slug: service.mainSlug?.name ?? "",
        name: service.name ?? "",
        tagLine: service.tagLine ?? "",
        description: service.description ?? "",
        type: service.type ?? "APPOINTMENT",
        durationMinutes: service.schedule?.availabilityConstraints?.sessionDurations?.[0] ?? null,
        price,
        requiresPayment: rate != null && rate !== "NO_FEE",
        image: service.media?.mainMedia?.image ?? null,
      };
    });
}

/**
 * Fetch bookable slots for a service on a given day, in the visitor's timezone.
 * Errors propagate to the caller so the UI can surface an error state.
 */
export async function getAvailableSlots(date: Date, serviceId: string): Promise<TimeSlot[]> {
  const timezone = getVisitorTimezone();
  const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);

  const availability = await availabilityCalendar.queryAvailability(
    {
      filter: {
        serviceId: [serviceId],
        startDate: startOfDay.toISOString(),
        endDate: endOfDay.toISOString(),
      },
    },
    { timezone },
  );

  const timeFormat = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "numeric",
    hour12: true,
    timeZone: timezone,
  });

  return (availability.availabilityEntries ?? []).map((item) => ({
    time: item.slot?.startDate!,
    display: timeFormat.format(new Date(item.slot?.startDate!)),
    available: item.bookable!,
    entity: item,
  }));
}

/** Book a free service directly: create the booking, then place a zero-total order. */
export async function createFreeBooking(data: BookingData, slot: TimeSlot) {
  const [firstName, ...rest] = data.name.trim().split(" ");
  const lastName = rest.join(" ");

  const booking = await bookings.createBooking({
    bookedEntity: slot.entity,
    totalParticipants: 1,
    contactDetails: { firstName, lastName, email: data.email, phone: data.phone },
  });

  const createdCart = await cartV2.createCart({
    cart: {
      source: { channelType: "WEB" },
      customerInfo: { email: data.email },
      paymentInfo: { billingContact: { firstName, lastName, phone: data.phone } },
    },
    catalogItems: [
      {
        quantity: 1,
        catalogReference: { appId: BOOKINGS_APP_ID, catalogItemId: booking.booking!._id! },
      },
    ],
  });

  const cartId = createdCart._id!;
  const calculated = await cartV2.calculateCart(cartId);
  await cartV2.placeOrder(cartId, {
    priceVerificationToken: calculated.summary?.priceVerificationToken ?? undefined,
  });

  return booking;
}

/** Paid services: send the visitor to the secure Wix-hosted bookings checkout. */
export async function getCheckoutUrl(slot: any, returnUrl: string, thankYouUrl: string) {
  const { redirectSession } = await redirects.createRedirectSession({
    bookingsCheckout: { slotAvailability: slot, timezone: getVisitorTimezone() },
    callbacks: { postFlowUrl: returnUrl, thankYouPageUrl: thankYouUrl },
  });
  return redirectSession?.fullUrl;
}

/** Courses enroll as a whole program, so hand off to the Wix-hosted booking page. */
export async function getBookPageUrl(returnUrl: string) {
  const { redirectSession } = await redirects.createRedirectSession({
    bookingsBook: {},
    callbacks: { postFlowUrl: returnUrl },
  });
  return redirectSession?.fullUrl;
}
