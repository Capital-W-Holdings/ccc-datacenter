import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // CCC Brand Colors - Orange Theme
        brand: {
          gold: {
            DEFAULT: '#e67e22',
            dark: '#d35400',
            light: '#f39c12',
            muted: '#e67e2220',
          },
          blue: {
            DEFAULT: '#2596be',
            dark: '#1e7ca0',
            light: '#4db0d4',
          },
        },
        // Background colors
        surface: {
          DEFAULT: '#ffffff',
          primary: '#ffffff',
          secondary: '#f8f9fa',
          tertiary: '#f1f5f9',
        },
        // Text colors
        text: {
          primary: '#0f172a',
          secondary: '#64748b',
          muted: '#94a3b8',
          tertiary: '#a1a1aa',
        },
        // Border colors
        border: {
          DEFAULT: '#e2e8f0',
          primary: '#e2e8f0',
          light: '#f1f5f9',
          gold: '#e67e22',
        },
        // Status colors (matches ProspectStatus type)
        status: {
          new: '#3b82f6',
          qualified: '#8b5cf6',
          contacted: '#f59e0b',
          engaged: '#10b981',
          nurturing: '#06b6d4',
          archived: '#6b7280',
        },
      },
      fontFamily: {
        display: ['Playfair Display', 'Georgia', 'serif'],
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgb(0 0 0 / 0.05), 0 1px 2px -1px rgb(0 0 0 / 0.05)',
        'card-hover': '0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.07)',
        'panel': '0 10px 15px -3px rgb(0 0 0 / 0.05), 0 4px 6px -4px rgb(0 0 0 / 0.05)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'slide-in-left': 'slideInLeft 0.3s ease-out',
        'pulse-gold': 'pulseGold 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideInLeft: {
          '0%': { transform: 'translateX(-100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        pulseGold: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(230, 126, 34, 0.4)' },
          '50%': { boxShadow: '0 0 0 8px rgba(230, 126, 34, 0)' },
        },
      },
    },
  },
  plugins: [],
}

export default config
