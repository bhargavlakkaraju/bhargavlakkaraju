/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Content-first dark UI: near-black canvas, flat raised surfaces, one accent (pink).
        ink: '#0a0a0c',
        night: '#0f0f12',
        panel: '#141418',
        card: '#1b1b21',
        raised: '#23232b',
        line: 'rgba(255,255,255,0.08)',
        mute: '#8d8d99',
        pink: { DEFAULT: '#ff3d7f', dark: '#c21556' },
        sun: '#ffd23f',
        aqua: '#22d3ee',
        lime: '#a3e635',
        grape: '#8b5cf6',
      },
      fontFamily: {
        display: ['Fredoka', 'Nunito', 'system-ui', 'sans-serif'],
        arcade: ['Bungee', 'Fredoka', 'system-ui', 'sans-serif'],
        cond: ['"Barlow Condensed"', 'Fredoka', 'system-ui', 'sans-serif'],
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
