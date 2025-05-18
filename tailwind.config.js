/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ["src/component/**/*.svelte"],
	theme: {
		backgroundColor: {
			transparent: "transparent",
			current: "currentColor",
			primary: "var(--background-primary)",
			"primary-alt": "var(--background-primary-alt)",
			secondary: "var(--background-secondary)",
			"secondary-alt": "var(--background-secondary-alt)",
			error: "var(--background-modifier-error)",
			success: "var(--background-modifier-success)",
			"form-field": "var(--background-modifier-form-field)",
			hover: "var(--background-modifier-hover)",
			interactive: "var(--interactive-normal)",
			"interactive-hover": "var(--interactive-hover)",
			"interactive-accent": "var(--interactive-accent)",
			"interactive-accent-hover": "var(--interactive-accent-hover)",
		},
		extend: {
			colors: {
				accent: "var(--text-accent)",
				muted: "var(--text-muted)",
				faint: "var(--text-faint)",
				error: "var(--text-error)",
				"on-accent": "var(--text-on-accent)",
				border: "var(--background-modifier-border)",
			},
			fontSize: {
				xs: ["var(--font-ui-smaller)", { lineHeight: "var(--line-height-tight)" }],
				sm: ["var(--font-ui-small)", { lineHeight: "var(--line-height-tight)" }],
				base: ["var(--font-ui-medium)", { lineHeight: "var(--line-height-normal)" }],
				lg: ["var(--font-ui-large)", { lineHeight: "var(--line-height-normal)" }],
			},
		},
	},

	plugins: [],
}
