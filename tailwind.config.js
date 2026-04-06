/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        headline: ["Manrope", "system-ui", "-apple-system", "sans-serif"],
        body: ["Manrope", "system-ui", "-apple-system", "sans-serif"],
        label: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["JetBrains Mono", "Menlo", "Monaco", "monospace"],
      },
      colors: {
        primary: {
          DEFAULT: '#00113a',
          container: '#002366',
        },
        secondary: '#5d5e61',
        tertiary: {
          container: '#cca830',
        },
        surface: {
          DEFAULT: '#f8f9fa',
          'container-lowest': '#ffffff',
          'container-low': '#f3f4f5',
          'container-high': '#e8e9eb',
        },
        'on-surface': '#191c1d',
        'on-surface-variant': '#44474a',
        outline: {
          DEFAULT: '#74777b',
          variant: '#c4c7cb',
        },
      },
      borderRadius: {
        DEFAULT: '0.125rem',
        lg: '0.25rem',
        xl: '0.5rem',
        full: '0.75rem',
      },
    },
  },
  plugins: [],
};
