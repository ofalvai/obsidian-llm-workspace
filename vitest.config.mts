import { defineConfig } from "vitest/config"

export default defineConfig({
	test: {
		// Use jsdom environment for any DOM-related testing if needed
		environment: "node",
		include: ["src/**/*.{test,spec}.{js,ts}"],
		exclude: ["node_modules", "out", ".obsidian"],

		// Use threads for better performance
		threads: true,

		coverage: {
			provider: "v8",
			reporter: ["text", "html"],
			exclude: [
				"node_modules/",
				"src/**/*.{test,spec}.{js,ts}",
				"src/**/types.ts",
				"out/",
				"*.config.*",
			],
		},
	},

	resolve: {
		alias: {
			// Match the baseUrl from tsconfig.json
			src: new URL("./src", import.meta.url).pathname,
		},
	},
})
