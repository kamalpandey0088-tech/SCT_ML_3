/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0a0a0a',
        surface: '#111111',
        border: '#1a1a1a',
        'cyan-glow': '#06b6d4',
        'violet-glow': '#8b5cf6',
        'green-glow': '#22c55e',
        'pink-glow': '#ec4899',
      },
      fontFamily: {
        sans: ['"Space Grotesk"', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'grid-pattern':
          'linear-gradient(rgba(6,182,212,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.04) 1px, transparent 1px)',
      },
      backgroundSize: {
        grid: '60px 60px',
      },
      animation: {
        'spin-slow': 'spin 10s linear infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4,0,0.6,1) infinite',
        'float': 'float 6s ease-in-out infinite',
        'scan-laser': 'scanLaser 1.8s cubic-bezier(0.4,0,0.6,1) forwards',
        'glow-cyan': 'glowCyan 2s ease-in-out infinite',
        'glow-green': 'glowGreen 2s ease-in-out infinite',
        'border-spin': 'borderSpin 3s linear infinite',
        'count-up': 'countUp 0.3s ease-out',
        'fade-in-up': 'fadeInUp 0.7s ease-out forwards',
      },
      keyframes: {
        float: {
          '0%,100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-14px)' },
        },
        scanLaser: {
          '0%': { top: '0%', opacity: '1' },
          '85%': { opacity: '1' },
          '100%': { top: '100%', opacity: '0' },
        },
        glowCyan: {
          '0%,100%': {
            boxShadow: '0 0 20px rgba(6,182,212,0.35), 0 0 60px rgba(6,182,212,0.1), inset 0 0 30px rgba(6,182,212,0.03)',
          },
          '50%': {
            boxShadow: '0 0 40px rgba(6,182,212,0.6), 0 0 100px rgba(6,182,212,0.2), inset 0 0 50px rgba(6,182,212,0.06)',
          },
        },
        glowGreen: {
          '0%,100%': {
            boxShadow: '0 0 20px rgba(34,197,94,0.35), 0 0 60px rgba(34,197,94,0.1), inset 0 0 30px rgba(34,197,94,0.03)',
          },
          '50%': {
            boxShadow: '0 0 40px rgba(34,197,94,0.6), 0 0 100px rgba(34,197,94,0.2), inset 0 0 50px rgba(34,197,94,0.06)',
          },
        },
        borderSpin: {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        countUp: {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      dropShadow: {
        'cyan': '0 0 20px rgba(6,182,212,0.5)',
        'violet': '0 0 20px rgba(139,92,246,0.5)',
      },
    },
  },
  plugins: [],
}
