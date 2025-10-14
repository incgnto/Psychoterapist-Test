import type { Config } from 'tailwindcss'
import typography from '@tailwindcss/typography'

const config: Config = {
  // Force light unless you add `dark` class (you don’t)
  darkMode: ['class'],

  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],

  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)'],
      },

      // Remove this block if you’re not using `primary-*` anywhere
      colors: {
        primary: {
          50:  '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
      },

      // Gentle motion + entry
      keyframes: {
        breathe: {
          '0%,100%': { transform: 'scale(1)', opacity: '1' },
          '50%':     { transform: 'scale(1.04)', opacity: '.97' },
        },
        glow: {
          '0%,100%': { opacity: '.55', transform: 'scale(1)' },
          '50%':     { opacity: '.85', transform: 'scale(1.06)' },
        },
        ripple: {
          '0%':   { transform: 'scale(1)',    opacity: '.25' },
          '70%':  { transform: 'scale(1.25)', opacity: '0' },
          '100%': { transform: 'scale(1.25)', opacity: '0' },
        },
      },
      animation: {
        'breathe-slow': 'breathe 4.5s ease-in-out infinite',
        'breathe-fast': 'breathe 2.6s ease-in-out infinite',
        'glow-slow':    'glow 4.5s ease-in-out infinite',
        'ripple-slow':  'ripple 3.6s ease-out infinite',
      },

      // Softer default for `prose`
      typography: ({ theme }: { theme: (path: string) => string }) => ({
  DEFAULT: {
    css: {
      color: theme('colors.slate.800'),
      a: {
        color: theme('colors.sky.700'),
        textDecorationColor: theme('colors.sky.300'),
        '&:hover': { color: theme('colors.sky.800') },
      },
      strong: { color: theme('colors.slate.900') },
      'h1,h2,h3,h4': { color: theme('colors.slate.900') },
      code: { color: theme('colors.slate.800') },
    },
  },
})

    },
  },

  plugins: [typography()],
}

export default config
