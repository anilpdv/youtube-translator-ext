/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './entrypoints/**/*.{html,ts,tsx}',
    './components/**/*.{html,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        youtube: {
          red: '#FF0000',
          dark: '#0F0F0F',
          card: '#1F1F1F',
          border: '#3F3F3F',
        }
      }
    },
  },
  plugins: [],
}
