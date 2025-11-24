import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        bebas: ['"Bebas Neue"', 'cursive'],
        vt323: ['VT323', 'monospace'],
      },
      colors: {
        background: '#181424',
        foreground: '#FEA282',
        deepPink: '#BD195D',
        brightPink: '#E72E77',
        midnight: '#0B0B14',
        slateViolet: '#101020',
        purplePanel: '#010513',
        darkPurple: '#181424',
        limeGreen: '#32CD32', //'#A2E634', // defifa '#32CD32', #8cc929
        limeGreenOpacity: 'rgba(162, 230, 52, 0.7)',
        lightPurple: '#C0B2F0',
        fontRed: '#EC017C',
        notWhite: '#FEA282',
        gold: '#FFD700',
      },
      keyframes: {
        'fall-in': {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      animation: {
        'fall-in': 'fall-in 0.5s ease-out forwards',
      },
    },
  },
  plugins: [],
} satisfies Config;
