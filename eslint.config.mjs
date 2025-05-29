// @ts-check
import eslint from "@eslint/js"
import svelte from "eslint-plugin-svelte"
import { globalIgnores } from "eslint/config"
import globals from "globals"
import parser from "svelte-eslint-parser"
import tseslint from "typescript-eslint"

export default tseslint.config([
	globalIgnores(["**/tailwind.config.js", "**/esbuild.config.mjs"]),
	eslint.configs.recommended,
	...tseslint.configs.recommended,
	...svelte.configs.prettier,
	{
		languageOptions: {
			globals: {
				...globals.node,
				...globals.browser,
			},
		},

		rules: {
			"@typescript-eslint/ban-ts-comment": [
				"error",
				{
					"ts-expect-error": "allow-with-description",
					"ts-ignore": true,
				},
			],

            // Note: you must disable the base rule as it can report incorrect errors
            "no-unused-vars": "off",
			"@typescript-eslint/no-unused-vars": "warn",
		},
	},
	{
        files: ["**/*.svelte"],
		languageOptions: {
            parser: parser,
			ecmaVersion: 5,
			sourceType: "script",
            
			parserOptions: {
                projectService: true,
                extraFileExtensions: ['.svelte'],
				parser: tseslint.parser,
			},
		},
        rules: {
            "svelte/valid-compile": "warn",
        }
	},
])
