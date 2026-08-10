/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Official Buffalo Bills palette
        bills: {
          royal: '#00338D', // Bills Royal Blue
          red: '#C60C30', // Bills Red
        },
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
        'glow-red': '0 0 0 3px rgba(198,12,48,0.9), 0 0 30px 6px rgba(198,12,48,0.65), 0 0 70px 14px rgba(198,12,48,0.35)',
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
            backgroundColor: 'rgba(198,12,48,0.95)',
            boxShadow: '0 0 0 3px rgba(198,12,48,0.9), 0 0 34px 8px rgba(198,12,48,0.6)',
          },
          '50%': {
            backgroundColor: 'rgba(120,6,26,0.85)',
            boxShadow: '0 0 0 2px rgba(198,12,48,0.5), 0 0 12px 2px rgba(198,12,48,0.25)',
          },
        },
        'flash-red-fast': {
          '0%, 100%': {
            backgroundColor: 'rgba(220,20,60,1)',
            boxShadow: '0 0 0 4px rgba(255,60,90,0.95), 0 0 46px 12px rgba(198,12,48,0.8)',
          },
          '50%': {
            backgroundColor: 'rgba(90,4,18,0.9)',
            boxShadow: '0 0 0 2px rgba(198,12,48,0.4), 0 0 10px 2px rgba(198,12,48,0.2)',
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
