# Frank M. Calletta American Legion Post 186 — Website

A Wix-managed headless site (Astro + Wix SDK) for American Legion Post 186 in Jennings, MO.

- **Wix site ID:** `3e5bab6a-7777-4a1d-a968-c910350d55c1`
- **Wix client ID:** `9a778b89-fd2c-46c6-8a99-3eb00aaf0d6d` (see `wix.config.json`)

## Pages

| Route | What it does | Wix app |
|---|---|---|
| `/` | Hero, mission, four pillars, live upcoming events and bookable services, get-involved CTAs | Events, Bookings |
| `/about` | Namesake, The American Legion, values, membership | — |
| `/programs` | Program overview and live bookable services | Bookings |
| `/events`, `/events/[slug]` | Live event list; detail page with RSVP or ticket purchase (Wix checkout) | Events & Tickets |
| `/book` | Pick service → date → time → confirm; paid services go to the Wix bookings checkout, courses go to the Wix booking page | Bookings |
| `/contact` | Contact & assistance form, rendered from the live Wix Form definition; `?topic=` preselects the inquiry type | Forms |
| `/booking-confirmation`, `/event-confirmation`, `/contact/thank-you` | Post-action confirmations | — |

All content the business owns (events, services, prices, form fields) is loaded from Wix at request time. Edit it in the Wix dashboard and the site updates automatically. Organization details (name, address) live in `src/utils/constants.ts`.

The contact form is the **"Contact & Assistance Request"** form (`724b0ef0-75e4-46ae-961a-d83337bdf4f7`) in Wix Forms. Submissions create or update contacts in your Wix CRM.

## Develop and deploy

Requires Node.js 20.11+.

```bash
npm install
npx wix login          # sign in to your Wix account
npx wix env pull       # writes .env.local with WIX_CLIENT_ID and server secrets
npm run dev            # local dev server
npm run build          # production build
npm run release        # deploy to Wix hosting
```

`.env.local` and `.wix/` are git-ignored; never commit them.
