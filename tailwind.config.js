/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        accent: "#F59E0B",
        surface: "#111111",
        secondary: "#888888",
      },
    },
  },
  plugins: [],
};
