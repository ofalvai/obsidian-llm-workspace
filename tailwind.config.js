/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
	"./component/**/*.svelte",
  ],
  theme: {
    extend: {},
  },
  corePlugins: {
	// Don't apply the global style reset, we want to use Obsidian's styling
	preflight: false,
  },
  plugins: [],
}

