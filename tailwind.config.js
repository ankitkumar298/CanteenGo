/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  corePlugins: {
    preflight: false, // PRESERVES 100% of existing CSS buttons, resets, inputs, and borders
  },
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#ea580c",
          dark: "#c2410c",
          light: "#ffedd5",
          hover: "#f97316",
        },
      },
    },
  },
  plugins: [],
};
