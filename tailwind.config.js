/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', //
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        brand: ['Skaters', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        primary: '0.5rem',
      },
colors: {
  rv: {
    pink: '#e46e8a',
    purple: '#b0669f',
    blue: '#0064d6',
    blueDark: '#00309b',
    navy: '#00021f',
    white: '#ffffff',
    darkBg: '#00021f',
    darkCard: '#404157',
    darkSurface: '#2a2b3d',
  },
},
backgroundImage: {
  'rv-gradient': 'linear-gradient(90deg, #e46e8a 0%, #b0669f 45%, #0064d6 100%)',
},
      boxShadow: {
        rv: '0 10px 30px rgba(0,0,0,0.35)',
      },
    },
  },
  plugins: [],
}
