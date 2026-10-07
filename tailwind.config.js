/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Dark chocolate scale
        cocoa: {
          50: '#F7F1EC',
          100: '#EBDDD1',
          200: '#D3B9A4',
          300: '#B08F75',
          400: '#8A6A52',
          500: '#6A4B38',
          600: '#4F3425',
          700: '#3A2418',
          800: '#2A1710',
          900: '#1C0F0A',
        },
        cream: { DEFAULT: '#FAF5EC', 100: '#F4EBDC', 200: '#EADBC4' },
        // The single strong accent: caramel. 600 passes AA with white text.
        caramel: {
          50: '#FDF6E9',
          100: '#F9E7C4',
          200: '#F1D08E',
          300: '#E3B04B',
          400: '#CD8D26',
          500: '#B8740F',
          600: '#A65F0B',
          700: '#864A09',
          800: '#673907',
        },
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', '"Hind Siliguri"', '"Noto Sans Bengali"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 1px 2px rgba(42,23,16,.06), 0 8px 24px -12px rgba(42,23,16,.18)',
        lift: '0 2px 4px rgba(42,23,16,.08), 0 18px 40px -16px rgba(42,23,16,.30)',
      },
      keyframes: {
        'toast-in': { from: { opacity: 0, transform: 'translateY(8px) scale(.98)' }, to: { opacity: 1, transform: 'none' } },
        'fade-in': { from: { opacity: 0 }, to: { opacity: 1 } },
        'pop-in': { from: { opacity: 0, transform: 'translateY(12px) scale(.98)' }, to: { opacity: 1, transform: 'none' } },
        'cart-bump': { '0%,100%': { transform: 'scale(1)' }, '40%': { transform: 'scale(1.25)' } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
      },
      animation: {
        'toast-in': 'toast-in .22s ease-out both',
        'fade-in': 'fade-in .18s ease-out both',
        'pop-in': 'pop-in .22s ease-out both',
        'cart-bump': 'cart-bump .35s ease-out',
      },
    },
  },
  plugins: [],
};
