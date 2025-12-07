/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./app.js", "./api/**/*.js"],
  theme: {
    extend: {},
  },
  plugins: [require('daisyui')],
  daisyui: {
    themes: [
      {
        mydark: {
          primary: '#7dd3fc',
          secondary: '#d4d4d8',
          accent: '#a5f3fc',
          neutral: '#1e293b',
          'base-100': '#2b2b33',
          'base-200': '#26262e',
          'base-300': '#1f1f26',
          info: '#38bdf8',
          success: '#4ade80',
          warning: '#facc15',
          error: '#f87171',
        },
      },
    ],
    darkTheme: 'mydark',
  },
};
