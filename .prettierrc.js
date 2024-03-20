/** @type {import("prettier").Config} */
const config = {
	plugins: ["prettier-plugin-svelte", "prettier-plugin-tailwindcss"],
	overrides: [{ files: "*.svelte", options: { parser: "svelte" } }],
	tabWidth: 4,
	useTabs: true,
	printWidth: 100,
	semi: false,
}
module.exports = config
