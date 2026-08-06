/** @type {import('tailwindcss').Config} */
// Hammonton School Board vote-pattern explorer. Nonpartisan civic identity:
// an ink-blue/slate chrome with a single violet highlight reserved for the
// focus candidate. Deliberately NOT red/blue — these are nonpartisan,
// vote-for-N school board races and no color here encodes a party.
//
// Data-viz colors live in src/lib/data/palette.ts (validated with the dataviz
// skill's checker); this file only carries the app chrome.
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          50: "#f4f5f9",
          100: "#e6e8f2",
          200: "#ccd0e4",
          300: "#a3aacb",
          400: "#7580ad",
          500: "#556093",
          600: "#414a76",
          700: "#343b5f",
          800: "#252a45",
          900: "#191d33",
          950: "#0e1020",
        },
        focus: {
          // The focus candidate's highlight — one color, used everywhere.
          DEFAULT: "#4a3aa7",
          soft: "#ece9f8",
          ring: "#c9c1ec",
          deep: "#372a80",
        },
      },
      boxShadow: {
        card: "0 1px 2px rgba(15,23,42,0.06), 0 1px 3px rgba(15,23,42,0.05)",
      },
    },
  },
  plugins: [require("@tailwindcss/forms")],
};
