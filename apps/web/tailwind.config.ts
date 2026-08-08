import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        cyber: {
          bg: '#07090e',
          cyan: '#00f0c9',
          emerald: '#10b981',
          amber: '#f59e0b',
          red: '#ef4444',
          purple: '#8a77ff',
          blue: '#93c5fd',
        },
        primary: {
          DEFAULT: '#00f0c9',
          dark: '#10b981',
        },
        neutral: {
          950: '#07090e',
          900: '#0c1017',
          850: '#111724',
          800: '#172033',
          700: '#26344d',
          400: '#64748b',
          200: '#e2e8f0',
        },
      },
      fontFamily: {
        sans: ['Poppins', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        '2xl': '14px',
        'xl': '11px',
        'lg': '10px',
        'chip': '9px',
      },
    },
  },
  plugins: [],
};
export default config;
