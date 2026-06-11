/** @type {import('tailwindcss').Config} */
// Bender for County Clerk brand palette: deep Atlantic teal replaces the
// LD8 app's navy. Components keep the `navy-*` class names; the hex values
// here define the brand.
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          50: "#eef7f6",
          100: "#d7ecea",
          200: "#b0d8d5",
          300: "#82bdba",
          400: "#579e9c",
          500: "#3d8183",
          600: "#2f676b",
          700: "#285257",
          800: "#1c3b40",
          900: "#122a30",
          950: "#0a1a1f",
        },
        slate: { 950: "#0b1220" },
        brand: {
          dem: "#3b6cb8",
          rep: "#b8454a",
          amber: "#c08a2e",
          purple: "#7e57c2",
          green: "#3f8f63",
          gold: "#d9a441",
        },
      },
      boxShadow: {
        card: "0 1px 2px rgba(15,23,42,0.06), 0 1px 3px rgba(15,23,42,0.05)",
      },
    },
  },
  plugins: [require("@tailwindcss/forms")],
};
