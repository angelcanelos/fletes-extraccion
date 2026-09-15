/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        verde: {
          DEFAULT: '#4c9a2a',
          fuerte: '#2f6b1f',
          suave: '#eaf6df',
          borde: '#cfe8ba'
        },
        navy: '#0e2841',
        fondo: '#f4f8f1'
      },
      boxShadow: {
        panel: '0 2px 10px rgba(20, 40, 10, 0.08)'
      },
      borderRadius: {
        panel: '12px'
      },
      keyframes: {
        'toast-in': {
          '0%': { opacity: '0', transform: 'translateY(-10px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' }
        },
        'modal-in': {
          '0%': { opacity: '0', transform: 'scale(0.96) translateY(6px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' }
        },
        'overlay-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        }
      },
      animation: {
        'toast-in': 'toast-in 240ms cubic-bezier(0.16, 1, 0.3, 1)',
        'modal-in': 'modal-in 200ms cubic-bezier(0.16, 1, 0.3, 1)',
        'overlay-in': 'overlay-in 150ms ease-out'
      }
    }
  },
  plugins: []
};
