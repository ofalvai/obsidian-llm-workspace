/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
	"./component/**/*.svelte",
  ],
  theme: {
    extend: {
		fontSize: {
			xs: ['var(--font-ui-smaller)', { lineHeight: '1rem' }],
			sm: ['var(--font-ui-small)', { lineHeight: '1.25rem' }],
			base: ['var(--font-ui-medium)', { lineHeight: '1.5rem' }],
			lg: ['var(--font-ui-large)', { lineHeight: '1.75rem' }],
		},
	},
  },
  corePlugins: {
	// Don't apply the global style reset, we want to use Obsidian's styling
	preflight: false,
  },
  plugins: [],
}

