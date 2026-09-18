/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Every colour is a CSS variable so the light and dark palettes are
        // defined once, in index.css, instead of twice in every component.
        canvas: 'rgb(var(--canvas) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        raised: 'rgb(var(--raised) / <alpha-value>)',
        line: 'rgb(var(--line) / <alpha-value>)',
        ink: 'rgb(var(--ink) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        bid: 'rgb(var(--bid) / <alpha-value>)',
        win: 'rgb(var(--win) / <alpha-value>)',
        urgent: 'rgb(var(--urgent) / <alpha-value>)',
        gold: 'rgb(var(--gold) / <alpha-value>)',
        neon: {
          gold: '#FFB800',
          cyan: '#00F0FF',
          purple: '#A855F7',
          pink: '#FF0055',
          emerald: '#10B981',
        },
      },
      fontFamily: {
        display: ['Sora', 'system-ui', 'sans-serif'],
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '18px',
        pill: '999px',
      },
      boxShadow: {
        lift: '0 18px 40px -24px rgb(var(--shadow) / 0.55)',
        ring: '0 0 0 1px rgb(var(--line) / 1)',
        'neon-gold': '0 0 25px -4px rgba(255, 184, 0, 0.45)',
        'neon-cyan': '0 0 25px -4px rgba(0, 240, 255, 0.45)',
        'neon-purple': '0 0 25px -4px rgba(168, 85, 247, 0.45)',
        'neon-pink': '0 0 25px -4px rgba(255, 0, 85, 0.45)',
        'neon-emerald': '0 0 25px -4px rgba(16, 185, 129, 0.45)',
      },
      keyframes: {
        'price-tick': {
          '0%': { transform: 'translateY(0.35em)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'pulse-ring': {
          '0%': { boxShadow: '0 0 0 0 rgb(var(--urgent) / 0.45)' },
          '70%': { boxShadow: '0 0 0 10px rgb(var(--urgent) / 0)' },
          '100%': { boxShadow: '0 0 0 0 rgb(var(--urgent) / 0)' },
        },
      },
      animation: {
        'price-tick': 'price-tick 220ms ease-out',
        'pulse-ring': 'pulse-ring 1.6s ease-out infinite',
      },
    },
  },
  plugins: [],
};
