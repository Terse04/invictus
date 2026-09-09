/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        cinzel: ['Cinzel', 'serif'],
        tech: ['Space Grotesk', 'monospace'],
        sans: ['Outfit', 'sans-serif'],
      },
      colors: {
        cyan: {
          400: '#00f2fe',
          500: '#00d2fe',
          950: '#031726',
        }
      }
    },
  },
  plugins: [],
}
