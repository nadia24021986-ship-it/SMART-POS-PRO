import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2563eb',
        },
        success: {
          DEFAULT: '#10b981',
        },
        brand: {
          orange: '#f59e0b',
          accent: '#14b8a6',
          dark: '#0f1420',
          darker: '#0a0e17',
          card: '#1a2032',
          card2: '#212940',
        },
      },
    },
  },
  plugins: [],
};

export default config;
