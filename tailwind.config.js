/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      transitionDuration: {
        320: '320ms',
      },
    },
  },
  plugins: [],
  // Avoid resetting existing global styles (Nunito, buttons, etc.)
  corePlugins: {
    preflight: false,
  },
};
