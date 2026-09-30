/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        synora: {
          bg: '#03000a',
          surface: '#090514',
          card: 'rgba(17, 12, 30, 0.70)',
          border: 'rgba(255, 255, 255, 0.08)',
          borderHover: 'rgba(124, 58, 237, 0.45)',
          primary: '#7c3aed',
          primaryGlow: 'rgba(124, 58, 237, 0.5)',
          secondary: '#06b6d4',
          secondaryGlow: 'rgba(6, 182, 212, 0.5)',
          accent: '#ec4899',
          success: '#10b981',
          warning: '#f59e0b',
          danger: '#ef4444',
          text: '#f8fafc',
          muted: '#94a3b8',
          dim: '#475569'
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Poppins', 'sans-serif'],
        display: ['Space Grotesk', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'glow-primary': '0 0 25px rgba(124, 58, 237, 0.45)',
        'glow-secondary': '0 0 25px rgba(6, 182, 212, 0.45)',
        'glow-accent': '0 0 25px rgba(236, 72, 153, 0.45)',
        'glow-danger': '0 0 25px rgba(239, 68, 68, 0.4)',
        'card-dark': '0 20px 50px rgba(0, 0, 0, 0.8), 0 0 35px rgba(124, 58, 237, 0.15)',
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'floating 4s ease-in-out infinite',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.6', transform: 'scale(0.95)' },
        },
        floating: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        }
      }
    },
  },
  plugins: [],
}
