/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#eef9ff',
          100: '#d8f0ff',
          200: '#b9e6ff',
          300: '#87d7ff',
          400: '#4dc0ff',
          500: '#22a3f7',
          600: '#0d85e8',
          700: '#0f6dca',
          800: '#1358a4',
          900: '#154b82',
          950: '#112f54',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
