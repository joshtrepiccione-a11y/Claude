/** @type {import('tailwindcss').Config} */
// Re-Elect Sheriff Joe O'Donoghue brand palette: deep navy/charcoal with
// Republican red and a gold sheriff-badge accent. Components keep the
// `navy-*` class names; the hex values here define the brand (a deep,
// near-black navy distinct from the teal Clerk app).
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          50: "#eef1f7",
          100: "#d8def0",
          200: "#b3bfe0",
          300: "#8595c7",
          400: "#5a6ba8",
          500: "#3d4d8a",
          600: "#2c3a6b",
          700: "#212c52",
          800: "#16203c",
          900: "#0f1b33",
          950: "#070d1c",
        },
        slate: { 950: "#0b1220" },
        brand: {
          dem: "#3b6cb8",
          rep: "#b8454a",
          red: "#b91c1c",
          amber: "#c08a2e",
          purple: "#7e57c2",
          green: "#3f8f63",
          gold: "#d4af37",
        },
      },
      boxShadow: {
        card: "0 1px 2px rgba(15,23,42,0.06), 0 1px 3px rgba(15,23,42,0.05)",
      },
    },
  },
  plugins: [require("@tailwindcss/forms")],
};
