/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0b0618',
        night: '#120b24',
        panel: '#170f2e',
        card: '#1f1540',
        line: 'rgba(255,255,255,0.08)',
        pink: { DEFAULT: '#ff3d7f', dark: '#c21556' },
        sun: '#ffd23f',
        aqua: '#22d3ee',
        lime: '#a3e635',
        grape: '#8b5cf6',
      },
      fontFamily: {
        display: ['Fredoka', 'Nunito', 'system-ui', 'sans-serif'],
        body: ['Nunito', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        pop: '0 6px 0 rgba(0,0,0,0.35)',
        glow: '0 0 40px rgba(255,61,127,0.35)',
      },
      keyframes: {
        floaty: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-6px)' } },
        pop: { '0%': { transform: 'scale(.6)', opacity: 0 }, '70%': { transform: 'scale(1.08)' }, '100%': { transform: 'scale(1)', opacity: 1 } },
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
      },
      animation: {
        floaty: 'floaty 3s ease-in-out infinite',
        pop: 'pop .35s ease-out both',
        shimmer: 'shimmer 3s linear infinite',
      },
    },
  },
  plugins: [],
};
