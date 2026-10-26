/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './index.tsx',
    './App.tsx',
    './constants.tsx',
    './components/**/*.{ts,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        agri: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        soil: {
          500: '#8B4513',
          600: '#723A0F',
        },
      },
    },
  },
  plugins: [],
  safelist: [
    // Dashboard builds these from `text-*-700` at runtime (`text-` → `bg-`).
    'bg-red-700',
    'bg-green-700',
    'bg-blue-700',
    'bg-cyan-700',
    'bg-amber-700',
    'bg-purple-700',
    'bg-indigo-700',
    'bg-orange-700',
    'bg-lime-700',
    'bg-yellow-700',
    'bg-emerald-700',
  ],
};
