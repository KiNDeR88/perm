/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: "#243369",
          red: "#DE2A1B",
          gray: "#EEEEEE",
        },
      },
      fontFamily: {
        din: ['"DIN Condensed"', '"DINCondensed"', '"Arial Narrow"', "sans-serif"],
        sofia: ['"Sofia Sans"', '"Sofia Sans Semi Condensed"', "system-ui", "sans-serif"],
      },
      borderRadius: {
        xl2: "1.25rem",
      },
    },
  },
  plugins: [],
};