import "server-only";

import type { Statement } from "./db";
import { addDays, addMonths, nowIso, todayInPostTz, weekdayOf, type Ymd } from "./dates";
import { lastWeekdayOfMonth, nthWeekdayOfMonth } from "./recurrence";

/**
 * Starter content, inserted once into a brand-new database.
 *
 * Everything here comes from public sources (Town of Hammonton event listings
 * and Hammonton Gazette coverage, 2026). Officers are listed by name and title
 * only — no phone numbers or email addresses — and should be confirmed in
 * Admin → Officers before launch.
 */
export async function seedStarterContent(batch: (statements: Statement[]) => Promise<void>): Promise<void> {
  const now = nowIso();
  const hall = "Post 186 Hall, 101 French Street, Hammonton";

  const officers: [string, string, number][] = [
    ["Joey Baez", "Commander", 10],
    ["Arthur Orsi", "Adjutant", 20],
    ["Diane Eby", "Chaplain", 30],
  ];

  const statements: Statement[] = [
    // Fails if starter content was already added, which cancels the whole batch.
    { sql: "INSERT INTO kv (key, value) VALUES ('seeded', ?)", args: [now] },
    ...officers.map(([name, title, sort]) => ({
      sql: `INSERT INTO officers (name, title, grp, sort_order, created_at, updated_at)
            VALUES (?, ?, 'officer', ?, ?, ?)`,
      args: [name, title, sort, now, now],
    })),
    {
      sql: `INSERT INTO events (slug, title, summary, description, category, location,
              start_date, start_time, end_time, audience, uses_hall, created_at, updated_at)
            VALUES (?, ?, ?, ?, 'community', ?, '2026-06-07', '11:00', '15:00', 'public', 1, ?, ?)`,
      args: [
        "family-day-2026",
        "American Legion Family Day",
        "Our first annual Family Day, with the dedication of the post in honor of Commander Frank M. Calletta.",
        "Post 186 hosted its first annual American Legion Family Day with free food, a chance to meet local veterans, and a ribbon-cutting ceremony at 1:00 PM dedicating the post in honor of our late Commander, Frank M. Calletta.\n\nThe whole community was welcome.",
        hall,
        now,
        now,
      ],
    },
    {
      sql: `INSERT INTO events (slug, title, summary, description, category, location,
              start_date, start_time, end_time, audience, uses_hall, created_at, updated_at)
            VALUES (?, ?, ?, ?, 'ceremony', ?, '2026-10-17', '17:00', '17:30', 'public', 0, ?, ?)`,
      args: [
        "flag-retirement-ceremony-2026",
        "Flag Retirement Ceremony",
        "A solemn ceremony to properly retire American flags that are torn, worn, discolored or faded.",
        "The community joined us for a Flag Retirement Ceremony to properly retire American flags that are torn, worn, discolored or faded.\n\nThese flags have proudly represented our nation, and when their service comes to an end they deserve to be retired with respect and honor.\n\nWorn flags can be dropped off at the post year-round.",
        "101 French Street, Hammonton",
        now,
        now,
      ],
    },
  ];

  // The post meets on the second Tuesday of every month. The start time is not
  // known here, so the meeting is saved as a draft: an officer adds the time and
  // publishes it (the dashboard reminds them). Until then it is not on the website.
  statements.push({
    sql: `INSERT INTO events (slug, title, summary, description, category, location,
            start_date, start_time, end_time, recurrence, audience, uses_hall, published,
            created_at, updated_at)
          VALUES (?, ?, ?, ?, 'meeting', ?, ?, NULL, NULL, 'monthly_nth', 'members', 1, 0, ?, ?)`,
    args: [
      MEETING_SLUG,
      "Monthly Membership Meeting",
      "Post business, reports and fellowship on the second Tuesday of each month.",
      "Our regular monthly meeting: officer and committee reports, upcoming events and new business.\n\nEligible veterans who are thinking about joining are welcome to stop in and meet the officers.",
      hall,
      nextSecondTuesday(todayInPostTz()),
      now,
      now,
    ],
  });

  try {
    await batch(statements);
  } catch (error) {
    // "seeded" already exists (or another worker won the race): nothing to do.
    if (!/UNIQUE|constraint/i.test(String((error as Error)?.message ?? error))) throw error;
  }
}

/** Slug of the starter meeting event; the dashboard looks for it while it is still a draft. */
export const MEETING_SLUG = "monthly-membership-meeting";

/** The second Tuesday on or after the given date. */
function nextSecondTuesday(from: Ymd): Ymd {
  const month = `${from.slice(0, 7)}-01`;
  const thisMonth = nthWeekdayOfMonth(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 2, 2)!;
  if (thisMonth >= from) return thisMonth;
  const next = addMonths(month, 1);
  return nthWeekdayOfMonth(Number(next.slice(0, 4)), Number(next.slice(5, 7)), 2, 2)!;
}

function nextWeekday(from: Ymd, weekday: number): Ymd {
  const offset = (weekday - weekdayOf(from) + 7) % 7 || 7;
  return addDays(from, offset);
}

/** Next date for a fixed month/day that is still in the future. */
function nextAnnual(today: Ymd, month: number, day: number): Ymd {
  const year = Number(today.slice(0, 4));
  const thisYear = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return thisYear > today
    ? thisYear
    : `${year + 1}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Sample content for previewing the site. Every row is flagged is_demo so
 * "Remove sample content" in Admin → Settings deletes exactly these rows and
 * nothing an officer has entered.
 */
export function demoContentStatements(): Statement[] {
  const now = nowIso();
  const today = todayInPostTz();
  const hall = "Post 186 Hall, 101 French Street, Hammonton";

  let breakfast = lastWeekdayOfMonth(Number(today.slice(0, 4)), Number(today.slice(5, 7)), 0);
  if (breakfast < today) {
    const next = addMonths(`${today.slice(0, 7)}-01`, 1);
    breakfast = lastWeekdayOfMonth(Number(next.slice(0, 4)), Number(next.slice(5, 7)), 0);
  }
  let memorialDay = lastWeekdayOfMonth(Number(today.slice(0, 4)), 5, 1);
  if (memorialDay < today) memorialDay = lastWeekdayOfMonth(Number(today.slice(0, 4)) + 1, 5, 1);

  type DemoEvent = {
    slug: string;
    title: string;
    summary: string;
    description: string;
    category: string;
    location: string;
    date: Ymd;
    start: string | null;
    end: string | null;
    recurrence?: string;
    audience?: string;
    usesHall?: boolean;
    featured?: boolean;
  };

  const events: DemoEvent[] = [
    {
      slug: "community-breakfast",
      title: "Community Breakfast",
      summary: "Pancakes, eggs, sausage and coffee served by Post 186 volunteers. Everyone is welcome.",
      description:
        "Join us for a hot breakfast served by Post 186 volunteers. Proceeds support our programs for local veterans and youth.\n\nVeterans eat free. Walk-ins welcome.",
      category: "fundraiser",
      location: hall,
      date: breakfast,
      start: "08:00",
      end: "11:00",
      recurrence: "monthly_last",
      usesHall: true,
      featured: true,
    },
    {
      slug: "pearl-harbor-remembrance",
      title: "Pearl Harbor Remembrance",
      summary: "A brief ceremony honoring those who served and those who were lost on December 7, 1941.",
      description:
        "We gather at the post flagpole for a moment of remembrance, a wreath laying and the playing of Taps. Light refreshments follow in the hall.",
      category: "ceremony",
      location: "Post 186 flagpole, 101 French Street, Hammonton",
      date: nextAnnual(today, 12, 7),
      start: "11:00",
      end: "11:45",
      recurrence: "yearly",
    },
    {
      slug: "veterans-benefits-help-session",
      title: "Veterans Benefits Help Session",
      summary: "Sit down with an accredited service officer for free help with VA claims and benefits.",
      description:
        "Bring your DD-214 and any VA correspondence. An accredited service officer will be on hand to answer questions about disability claims, health care enrollment, education benefits and survivor benefits.\n\nFree and open to all veterans and their families — you do not need to be a member.",
      category: "service",
      location: hall,
      date: nextWeekday(addDays(today, 9), 6),
      start: "10:00",
      end: "13:00",
    },
    {
      slug: "holiday-toy-drive",
      title: "Holiday Toy Drive Drop-off",
      summary: "Drop off new, unwrapped toys for local military and veteran families.",
      description:
        "Post 186 is collecting new, unwrapped toys for children of local military and veteran families. Drop donations at the hall during the hours listed, or call to arrange a pickup.",
      category: "community",
      location: hall,
      date: nextWeekday(addDays(today, 16), 6),
      start: "09:00",
      end: "14:00",
    },
    {
      slug: "memorial-day-service",
      title: "Memorial Day Service",
      summary: "Honoring the men and women who gave their lives in service to our country.",
      description:
        "Our annual Memorial Day service with the Post 186 color guard, a reading of names, and a wreath laying. The public is warmly invited.",
      category: "ceremony",
      location: "101 French Street, Hammonton",
      date: memorialDay,
      start: "10:00",
      end: "11:00",
      featured: true,
    },
  ];

  const eventStatements: Statement[] = events.map((e) => ({
    sql: `INSERT OR IGNORE INTO events (slug, title, summary, description, category, location,
            start_date, start_time, end_time, recurrence, audience, uses_hall, featured, is_demo,
            created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    args: [
      e.slug,
      e.title,
      e.summary,
      e.description,
      e.category,
      e.location,
      e.date,
      e.start,
      e.end,
      e.recurrence ?? "none",
      e.audience ?? "public",
      e.usesHall ? 1 : 0,
      e.featured ? 1 : 0,
      now,
      now,
    ],
  }));

  const saturday = nextWeekday(addDays(today, 20), 6);
  const bookings: [string, string, Ymd, string, string, string, number, string][] = [
    ["P186-DEMO1", "approved", saturday, "13:00", "17:00", "Birthday party", 45, "Sample Renter One"],
    ["P186-DEMO2", "pending", addDays(saturday, 7), "12:00", "16:00", "Baby or bridal shower", 35, "Sample Renter Two"],
    ["P186-DEMO3", "approved", addDays(saturday, 15), "14:00", "19:00", "Anniversary", 70, "Sample Renter Three"],
    ["P186-DEMO4", "pending", addDays(saturday, 28), "17:00", "22:00", "Graduation party", 60, "Sample Renter Four"],
  ];

  const bookingStatements: Statement[] = bookings.map(
    ([ref, status, date, start, end, type, guests, name]) => ({
      sql: `INSERT OR IGNORE INTO bookings (reference, status, event_date, start_time, end_time,
              event_type, guest_count, contact_name, contact_email, contact_phone, notes, source,
              is_demo, created_at, updated_at, decided_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'sample@example.com', '(609) 555-0100',
              'Sample request for previewing the booking tools.', 'web', 1, ?, ?, ?)`,
      args: [ref, status, date, start, end, type, guests, name, now, now, status === "approved" ? now : null],
    }),
  );

  return [...eventStatements, ...bookingStatements];
}
