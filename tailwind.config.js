/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Team-themed brand tokens. These resolve to CSS variables set per team
        // by ThemeProvider, so every `bills-royal` / `bills-red` class re-themes
        // automatically when a different team is selected. Buffalo is the
        // default palette (defined in index.css :root).
        bills: {
          royal: 'rgb(var(--team-primary) / <alpha-value>)',
          'royal-light': 'rgb(var(--team-primary-light) / <alpha-value>)',
          red: 'rgb(var(--team-secondary) / <alpha-value>)',
        },
        team: {
          primary: 'rgb(var(--team-primary) / <alpha-value>)',
          'primary-light': 'rgb(var(--team-primary-light) / <alpha-value>)',
          secondary: 'rgb(var(--team-secondary) / <alpha-value>)',
          accent: 'rgb(var(--team-accent) / <alpha-value>)',
        },
        // Alert red is intentionally NOT themed — urgency must read the same on
        // every team's board (a red team's GO alert still looks like an alert).
        redbright: '#FF1F3E',
        // Dark navy surface ramp used for backgrounds / cards
        navy: {
          950: '#04070F',
          900: '#070C18',
          850: '#0A1122',
          800: '#0E1730',
          700: '#152246',
          600: '#1D2E5C',
        },
        alert: {
          warn: '#FFC72C', // 5-minute yellow
          go: '#22C55E', // GO / completed green
        },
      },
      fontFamily: {
        display: ['"Rajdhani"', '"Barlow Condensed"', 'system-ui', 'sans-serif'],
        mono: ['"Roboto Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'glow-red': '0 0 0 3px rgba(255,31,62,0.95), 0 0 34px 8px rgba(255,31,62,0.7), 0 0 80px 16px rgba(255,31,62,0.4)',
        'glow-yellow': '0 0 0 2px rgba(255,199,44,0.85), 0 0 24px 4px rgba(255,199,44,0.45)',
        'glow-blue': '0 0 40px rgba(0,51,141,0.55)',
      },
      keyframes: {
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.72' },
        },
        'flash-red': {
          '0%, 100%': {
            backgroundColor: 'rgba(255,31,62,1)',
            boxShadow: '0 0 0 3px rgba(255,70,95,1), 0 0 40px 10px rgba(255,31,62,0.7)',
          },
          '50%': {
            backgroundColor: 'rgba(190,10,38,0.9)',
            boxShadow: '0 0 0 2px rgba(255,31,62,0.55), 0 0 14px 3px rgba(255,31,62,0.3)',
          },
        },
        'flash-red-fast': {
          '0%, 100%': {
            backgroundColor: 'rgba(255,45,75,1)',
            boxShadow: '0 0 0 4px rgba(255,90,115,1), 0 0 52px 14px rgba(255,31,62,0.85)',
          },
          '50%': {
            backgroundColor: 'rgba(150,8,30,0.92)',
            boxShadow: '0 0 0 2px rgba(255,31,62,0.5), 0 0 12px 3px rgba(255,31,62,0.25)',
          },
        },
        'flash-go': {
          '0%, 100%': { backgroundColor: 'rgba(34,197,94,0.95)', boxShadow: '0 0 0 3px rgba(34,197,94,0.9), 0 0 40px 10px rgba(34,197,94,0.6)' },
          '50%': { backgroundColor: 'rgba(15,90,45,0.85)', boxShadow: '0 0 0 2px rgba(34,197,94,0.45)' },
        },
        'bar-sweep': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
      animation: {
        'pulse-soft': 'pulse-soft 1.6s ease-in-out infinite',
        'flash-red': 'flash-red 1s ease-in-out infinite',
        'flash-red-fast': 'flash-red-fast 0.5s steps(2, end) infinite',
        'flash-go': 'flash-go 0.7s ease-in-out infinite',
        'bar-sweep': 'bar-sweep 2s linear infinite',
        marquee: 'marquee 30s linear infinite',
      },
    },
  },
  plugins: [],
}
