/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          50: "#f1f4f9",
          100: "#dde4ee",
          200: "#bcc8dc",
          300: "#94a4be",
          400: "#6f80a0",
          500: "#536584",
          600: "#3f4f6a",
          700: "#324057",
          800: "#1f2a3d",
          900: "#121a2a",
          950: "#0a1020",
        },
        slate: { 950: "#0b1220" },
        brand: {
          dem: "#3b6cb8",
          rep: "#b8454a",
          amber: "#c08a2e",
          purple: "#7e57c2",
          green: "#3f8f63",
        },
      },
      boxShadow: {
        card: "0 1px 2px rgba(15,23,42,0.06), 0 1px 3px rgba(15,23,42,0.05)",
      },
    },
  },
  plugins: [require("@tailwindcss/forms")],
};
