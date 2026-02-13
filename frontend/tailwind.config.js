/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        rosewine: '#3A0F1E',
        blush: '#F9C7D7',
        pearl: '#FFF8FB'
      },
      boxShadow: {
        glow: '0 0 32px rgba(255, 174, 197, 0.35)',
        soft: '0 0 20px rgba(255, 220, 235, 0.2)'
      },
      backgroundImage: {
        parisNight: 'radial-gradient(circle at 20% 20%, #7d203f 0%, #3A0F1E 35%, #1A0710 100%)',
        romantic: 'linear-gradient(135deg, #3A0F1E 0%, #8E2C55 45%, #F9C7D7 75%, #FFF8FB 100%)'
      },
      keyframes: {
        drift: {
          '0%': { transform: 'translateY(0px)', opacity: '0.2' },
          '50%': { transform: 'translateY(-24px)', opacity: '0.55' },
          '100%': { transform: 'translateY(0px)', opacity: '0.2' }
        },
        pulseSlow: {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.65' },
          '50%': { transform: 'scale(1.08)', opacity: '1' }
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' }
        },
        breathe: {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '0.8' }
        }
      },
      animation: {
        drift: 'drift 8s ease-in-out infinite',
        pulseSlow: 'pulseSlow 2.6s ease-in-out infinite',
        shimmer: 'shimmer 2.5s ease-in-out infinite',
        breathe: 'breathe 4s ease-in-out infinite'
      },
      backgroundImage: {
        ...require('tailwindcss/defaultConfig').theme.backgroundImage,
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))'
      }
    }
  },
  plugins: []
};