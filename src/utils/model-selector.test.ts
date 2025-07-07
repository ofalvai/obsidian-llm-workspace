import { describe, expect, it, vi } from "vitest"
import type { ModelConfiguration } from "src/config/settings"

// Mock the Svelte components to avoid import issues in tests
vi.mock("src/component/settings/AnthropicSettingsDialog.svelte", () => ({
	default: vi.fn(),
}))
vi.mock("src/component/settings/OllamaSettingsDialog.svelte", () => ({
	default: vi.fn(),
}))
vi.mock("src/component/settings/OpenAISettingsDialog.svelte", () => ({
	default: vi.fn(),
}))
vi.mock("src/component/settings/OpenAICompatibleSettingsDialog.svelte", () => ({
	default: vi.fn(),
}))

import {
	PROVIDERS_WITH_CUSTOM_SETTINGS,
	modelConfigToDropdownOptions,
	dropdownValueToModelConfig,
	modelConfigToDropdownValue,
} from "./model-selector"

describe("model-selector utilities", () => {
	const mockConfigs: ModelConfiguration[] = [
		{ provider: "OpenAI", model: "gpt-4.1-mini-2025-04-14" },
		{ provider: "OpenAI", model: "gpt-4.1-2025-04-14" },
		{ provider: "Anthropic", model: "claude-3-5-haiku-20241022" },
		{ provider: "Anthropic", model: "claude-sonnet-4-20250514" },
	]

	describe("PROVIDERS_WITH_CUSTOM_SETTINGS", () => {
		it("should contain expected providers", () => {
			expect(PROVIDERS_WITH_CUSTOM_SETTINGS.has("Ollama")).toBe(true)
			expect(PROVIDERS_WITH_CUSTOM_SETTINGS.has("OpenAI-compatible")).toBe(true)
			expect(PROVIDERS_WITH_CUSTOM_SETTINGS.has("OpenAI")).toBe(false)
			expect(PROVIDERS_WITH_CUSTOM_SETTINGS.has("Anthropic")).toBe(false)
		})
	})

	describe("modelConfigToDropdownOptions", () => {
		it("should convert model configs to dropdown options", () => {
			const result = modelConfigToDropdownOptions(mockConfigs)

			expect(result).toEqual({
				"gpt-4.1-mini-2025-04-14": "gpt-4.1-mini-2025-04-14",
				"gpt-4.1-2025-04-14": "gpt-4.1-2025-04-14",
				"claude-3-5-haiku-20241022": "claude-3-5-haiku-20241022",
				"claude-sonnet-4-20250514": "claude-sonnet-4-20250514",
				"Ollama": "Ollama",
				"OpenAI-compatible": "OpenAI-compatible",
			})
		})

		it("should handle empty configs array", () => {
			const result = modelConfigToDropdownOptions([])

			expect(result).toEqual({
				"Ollama": "Ollama",
				"OpenAI-compatible": "OpenAI-compatible",
			})
		})

		it("should handle duplicate model names", () => {
			const configsWithDuplicates: ModelConfiguration[] = [
				{ provider: "OpenAI", model: "gpt-4" },
				{ provider: "Anthropic", model: "gpt-4" },
			]

			const result = modelConfigToDropdownOptions(configsWithDuplicates)

			expect(result["gpt-4"]).toBe("gpt-4")
			expect(result["Ollama"]).toBe("Ollama")
			expect(result["OpenAI-compatible"]).toBe("OpenAI-compatible")
		})
	})

	describe("dropdownValueToModelConfig", () => {
		it("should find matching model config by model name", () => {
			const result = dropdownValueToModelConfig(mockConfigs, "gpt-4.1-mini-2025-04-14")

			expect(result).toEqual({
				provider: "OpenAI",
				model: "gpt-4.1-mini-2025-04-14",
			})
		})

		it("should return null for non-existent model", () => {
			const result = dropdownValueToModelConfig(mockConfigs, "non-existent-model")

			expect(result).toBeNull()
		})

		it("should return null for provider names", () => {
			const result = dropdownValueToModelConfig(mockConfigs, "Ollama")

			expect(result).toBeNull()
		})

		it("should handle empty configs array", () => {
			const result = dropdownValueToModelConfig([], "any-model")

			expect(result).toBeNull()
		})
	})

	describe("modelConfigToDropdownValue", () => {
		it("should return provider name for providers with custom settings", () => {
			const ollamaConfig: ModelConfiguration = {
				provider: "Ollama",
				model: "llama2",
			}

			const result = modelConfigToDropdownValue(ollamaConfig)

			expect(result).toBe("Ollama")
		})

		it("should return model name for providers without custom settings", () => {
			const openAIConfig: ModelConfiguration = {
				provider: "OpenAI",
				model: "gpt-4.1-mini-2025-04-14",
			}

			const result = modelConfigToDropdownValue(openAIConfig)

			expect(result).toBe("gpt-4.1-mini-2025-04-14")
		})

		it("should return provider name for OpenAI-compatible", () => {
			const compatibleConfig: ModelConfiguration = {
				provider: "OpenAI-compatible",
				model: "custom-model",
			}

			const result = modelConfigToDropdownValue(compatibleConfig)

			expect(result).toBe("OpenAI-compatible")
		})

		it("should return model name for Anthropic", () => {
			const anthropicConfig: ModelConfiguration = {
				provider: "Anthropic",
				model: "claude-sonnet-4-20250514",
			}

			const result = modelConfigToDropdownValue(anthropicConfig)

			expect(result).toBe("claude-sonnet-4-20250514")
		})
	})

	describe("integration tests", () => {
		it("should maintain consistency between dropdown conversion functions", () => {
			const options = modelConfigToDropdownOptions(mockConfigs)
			
			Object.keys(options).forEach(key => {
				if (key === "Ollama" || key === "OpenAI-compatible") {
					expect(dropdownValueToModelConfig(mockConfigs, key)).toBeNull()
				} else {
					const config = dropdownValueToModelConfig(mockConfigs, key)
					expect(config).not.toBeNull()
					expect(modelConfigToDropdownValue(config!)).toBe(key)
				}
			})
		})

		it("should handle round-trip conversion for all config types", () => {
			const allConfigs: ModelConfiguration[] = [
				...mockConfigs,
				{ provider: "Ollama", model: "llama2" },
				{ provider: "OpenAI-compatible", model: "custom-model" },
			]

			allConfigs.forEach(config => {
				const dropdownValue = modelConfigToDropdownValue(config)
				expect(dropdownValue).toBeDefined()
				
				if (PROVIDERS_WITH_CUSTOM_SETTINGS.has(config.provider)) {
					expect(dropdownValue).toBe(config.provider)
					expect(dropdownValueToModelConfig(allConfigs, dropdownValue)).toBeNull()
				} else {
					expect(dropdownValue).toBe(config.model)
					expect(dropdownValueToModelConfig(allConfigs, dropdownValue)).toEqual(config)
				}
			})
		})
	})
})
