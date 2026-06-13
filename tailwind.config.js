/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/renderer/index.html', './src/renderer/src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Bambu Lab esinli koyu palet
        ink: {
          900: '#0d0f10',
          850: '#121516',
          800: '#171a1c',
          750: '#1c2022',
          700: '#22282a',
          600: '#2c3336',
          500: '#3a4347'
        },
        bambu: {
          DEFAULT: '#00ae42',
          light: '#1ed368',
          dark: '#008f37',
          glow: '#00ae4233'
        },
        accent: {
          amber: '#ff9f1c',
          red: '#ff5c5c',
          blue: '#3da9fc'
        }
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'system-ui', 'sans-serif']
      },
      borderRadius: {
        xl: '14px',
        '2xl': '18px'
      }
    }
  },
  plugins: []
}
