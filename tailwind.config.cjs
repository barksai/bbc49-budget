/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        club: {
          red: '#C8102E',
          'red-dark': '#9B0014',
          'red-light': '#E53935',
          'red-soft': '#FEE2E2',
          black: '#111216',
          'black-card': '#181A20',
          'black-muted': '#262A34',
          gray: '#64748B',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
