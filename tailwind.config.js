/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class", // enable dark mode via class
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {

        /* LIGHT MODE COLORS */
        light: {
          DEFAULT: "#ffffff",
          background: "#f9fafb",
          surface: "#f3f4f6",
          text: "#111827",
        },
        
        /* DARK MODE COLORS */
        dark: {
          DEFAULT: "#0f0f23",
          lighter: "#1a1a2e",
          text: "#f9fafb",
        },

        /* PRIMARY COLORS */
        primary: {
          400: "#818cf8",
          500: "#6366f1",
        },

        /* ACCENT COLORS */
        accent: {
          purple: "#8b5cf6",
        },
      },
    },
  },
  plugins: [],
}