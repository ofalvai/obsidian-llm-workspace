/** @type {import('tailwindcss').Config} */
module.exports = {
	content: [
		"src/component/**/*.svelte",
	],
	theme: {
		backgroundColor: {
			transparent: 'transparent',
			current: 'currentColor',
			"primary": "var(--background-primary)",
			"primary-alt": "var(--background-primary-alt)",
			"secondary": "var(--background-secondary)",
			"secondary-alt": "var(--background-secondary-alt)",
			"error": "var(--background-modifier-error)",
			"success": "var(--background-modifier-success)",
			"form-field": "var(--background-modifier-form-field)",
		},
		extend: {
			fontSize: {
				xs: ['var(--font-ui-smaller)', { lineHeight: '1rem' }],
				sm: ['var(--font-ui-small)', { lineHeight: '1.25rem' }],
				base: ['var(--font-ui-medium)', { lineHeight: '1.5rem' }],
				lg: ['var(--font-ui-large)', { lineHeight: '1.75rem' }],
			},
		},
	},

	//   https://tailwindcss.com/docs/configuration#core-plugins
	corePlugins: [
		"alignItems",
		"alignSelf",
		"backgroundColor",
		"borderRadius",
		"display",
		"flex",
		"flexBasis",
		"flexDirection",
		"flexGrow",
		"flexShrink",
		"flexWrap",
		"fontFamily",
		"fontSize",
		"fontWeight",
		"height",
		"inset", // top, right, bottom, left
		"margin",
		"padding",
		"position",
		"resize",
		"screens",
		"size",
		"space",
		"textAlign",
		"userSelect",
		"width",
	],
	plugins: [],
}

