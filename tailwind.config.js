/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          400: '#818cf8',
          500: '#6366f1',
        },
        dark: {
          DEFAULT: '#0f0f23',
          lighter: '#1a1a2e',
        },
        accent: {
          purple: '#8b5cf6',
        }
      },
    },
  },
  plugins: [],
}