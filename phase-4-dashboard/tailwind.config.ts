import type { Config } from 'tailwindcss'

export default {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      animation: {
        'blob': 'blob 7s infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in-up': 'fadeInUp 0.6s ease-out forwards',
        'spin-slow': 'spin 8s linear infinite',
        'float-pyramid': 'floatPyramid 20s infinite ease-in-out',
        'gradient-x': 'gradient-x 12s ease infinite',
      },
      keyframes: {
        floatPyramid: {
          '0%, 100%': { transform: 'translate(0px, 0px) rotate(0deg) scale(1)' },
          '33%': { transform: 'translate(40px, -60px) rotate(15deg) scale(1.1)' },
          '66%': { transform: 'translate(-20px, 30px) rotate(-10deg) scale(0.9)' },
        },
        blob: {
          '0%': { transform: 'translate(0px, 0px) scale(1)' },
          '33%': { transform: 'translate(30px, -50px) scale(1.1)' },
          '66%': { transform: 'translate(-20px, 20px) scale(0.9)' },
          '100%': { transform: 'translate(0px, 0px) scale(1)' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'gradient-x': {
          '0%, 100%': {
            'background-size': '200% 200%',
            'background-position': 'left center'
          },
          '50%': {
            'background-size': '200% 200%',
            'background-position': 'right center'
          },
        }
      },
    },
  },
  plugins: [],
} satisfies Config
