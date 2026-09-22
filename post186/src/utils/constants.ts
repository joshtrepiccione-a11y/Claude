/**
 * Organization details shown in the header, footer, and page copy.
 * Update these values to match your post's current information.
 */
export const ORG_NAME = "Frank M. Calletta American Legion Post 186";
export const ORG_SHORT_NAME = "American Legion Post 186";
export const ORG_TAGLINE = "Veterans serving veterans, families, and the Jennings community.";

export const ORG_ADDRESS = {
  line1: "120 Spencer St",
  city: "Jennings",
  region: "MO",
  postalCode: "63136",
};
export const ORG_ADDRESS_ONE_LINE = `${ORG_ADDRESS.line1}, ${ORG_ADDRESS.city}, ${ORG_ADDRESS.region} ${ORG_ADDRESS.postalCode}`;
export const ORG_MAP_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ORG_ADDRESS_ONE_LINE)}`;

/**
 * ID of the "Contact & Assistance Request" form in Wix Forms. The fields are
 * rendered from the live form definition, so edit the form in your Wix
 * dashboard (Forms) and this site updates automatically.
 */
export const CONTACT_FORM_ID = "724b0ef0-75e4-46ae-961a-d83337bdf4f7";

/** The Wix Bookings app ID, used as the catalog reference for bookings in eCommerce. */
export const BOOKINGS_APP_ID = "13d21c63-b5ec-5912-8397-c3a5ddb27a97";

/** Veterans Crisis Line — a national resource, not operated by the post. */
export const CRISIS_LINE = {
  phone: "988",
  press: "1",
  text: "838255",
  url: "https://www.veteranscrisisline.net/",
};

export const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/programs", label: "Programs" },
  { href: "/events", label: "Events" },
  { href: "/book", label: "Book a Service" },
  { href: "/contact", label: "Contact" },
];
