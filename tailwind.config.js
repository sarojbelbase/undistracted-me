/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./public/index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'accent-1': '#141414',
        'accent-2': '#2A2A2A',
        'accent-3': '#404040',
        'accent-4': '#6366F1',
        'accent-6': '#EC4899',
        'accent-7': '#10B981',
        'accent-8': '#F59E0B',
      },
      gridTemplateColumns: {
        '12': 'repeat(12, minmax(0, 1fr))',
      },
      gridTemplateRows: {
        '8': 'repeat(8, minmax(0, 1fr))',
      },
      gap: {
        'widget': '2rem',
      },
      margin: {
        'container': '1rem',
      }
    },
  },
  plugins: [],
}