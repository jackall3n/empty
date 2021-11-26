module.exports = {
  mode: 'jit',
  purge: ['./pages/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  darkMode: false, // or 'media' or 'class'
  theme: {
    // extend: {},
    // fontFamily: {
    //   montserrat: ['Montserrat', 'sans-serif'],
    //   lora: ['Lora', 'serif'],
    //   sans: ['Open Sans', 'sans-serif'],
    //   lato: ['Lato',  'sans-serif'],
    // },
  },
  variants: {
    extend: {},
  },
  plugins: [],
}
