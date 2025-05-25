import type { TFile, Vault } from "obsidian"
import type { EmbeddedFileInfo } from "src/component/types"
import { WORKSPACE_QUESTIONS_PROMPT } from "src/config/prompts"
import type { ChatCompletionClient } from "src/rag/llm/common"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { workspaceQuestions, type WorkspaceQuestion } from "./workspace-questions"

describe("workspaceQuestions", () => {
	let mockClient: ChatCompletionClient
	let mockVault: Vault
	let mockFiles: EmbeddedFileInfo[]

	beforeEach(() => {
		mockClient = {
			createJSONCompletion: vi.fn(),
			createChatCompletion: vi.fn(),
			displayName: "Mock Client",
		}

		mockVault = {
			getFileByPath: vi.fn(),
			cachedRead: vi.fn(),
		} as unknown as Vault

		mockFiles = [
			{ path: "note1.md", name: "note1", parent: null, nodeCount: 1, lastProcessed: 1 },
			{ path: "note2.md", name: "note2", parent: null, nodeCount: 1, lastProcessed: 1 },
			{ path: "note3.md", name: "note3", parent: null, nodeCount: 1, lastProcessed: 1 },
			{ path: "note4.md", name: "note4", parent: null, nodeCount: 1, lastProcessed: 1 },
			{ path: "note5.md", name: "note5", parent: null, nodeCount: 1, lastProcessed: 1 },
			{ path: "note6.md", name: "note6", parent: null, nodeCount: 1, lastProcessed: 1 },
			{ path: "note7.md", name: "note7", parent: null, nodeCount: 1, lastProcessed: 1 },
			{ path: "note8.md", name: "note8", parent: null, nodeCount: 1, lastProcessed: 1 },
			{ path: "note9.md", name: "note9", parent: null, nodeCount: 1, lastProcessed: 1 },
			{ path: "note10.md", name: "note10", parent: null, nodeCount: 1, lastProcessed: 1 },
			{ path: "note11.md", name: "note11", parent: null, nodeCount: 1, lastProcessed: 1 },
			{ path: "note12.md", name: "note12", parent: null, nodeCount: 1, lastProcessed: 1 },
		]
	})

	it("should return questions from LLM response", async () => {
		const expectedQuestions: WorkspaceQuestion[] = [
			{ content: "How does machine learning work?", theme: "ML basics" },
			{ content: "What are the ethical implications of AI?", theme: "ethics" },
			{ content: "How can AI be applied to healthcare?", theme: "healthcare" },
		]

		vi.mocked(mockClient.createJSONCompletion).mockResolvedValue({
			questions: expectedQuestions,
		})

		const mockFile = { path: "test.md" } as TFile
		vi.mocked(mockVault.getFileByPath).mockReturnValue(mockFile)
		vi.mocked(mockVault.cachedRead).mockResolvedValue("AI and ML content")

		const singleFile = [
			{ path: "test.md", name: "test", parent: null, nodeCount: 1, lastProcessed: 1 },
		]
		const result = await workspaceQuestions(mockClient, mockVault, singleFile)

		expect(result).toEqual(expectedQuestions)
		expect(result).toHaveLength(3)
		expect(result[0].content).toBe("How does machine learning work?")
		expect(result[0].theme).toBe("ML basics")
	})

	it("should handle files with content shorter than truncate limit", async () => {
		const shortContent = "Short content"
		const mockQuestions: WorkspaceQuestion[] = [
			{ content: "What is this about?", theme: "topic" },
		]

		vi.mocked(mockClient.createJSONCompletion).mockResolvedValue({ questions: mockQuestions })

		const mockFile = { path: "short.md" } as TFile
		vi.mocked(mockVault.getFileByPath).mockReturnValue(mockFile)
		vi.mocked(mockVault.cachedRead).mockResolvedValue(shortContent)

		const singleFile = [
			{ path: "short.md", name: "short", parent: null, nodeCount: 1, lastProcessed: 1 },
		]
		await workspaceQuestions(mockClient, mockVault, singleFile)

		const [[, context]] = vi.mocked(mockClient.createJSONCompletion).mock.calls
		expect(context).toContain(shortContent)
		expect(context).not.toContain("(truncated)")
	})

	it("should truncate files with content longer than limit", async () => {
		const longContent = "a".repeat(1500) // Longer than 1000 character limit
		const mockQuestions: WorkspaceQuestion[] = [
			{ content: "What is this long content about?", theme: "content" },
		]

		vi.mocked(mockClient.createJSONCompletion).mockResolvedValue({ questions: mockQuestions })

		const mockFile = { path: "long.md" } as TFile
		vi.mocked(mockVault.getFileByPath).mockReturnValue(mockFile)
		vi.mocked(mockVault.cachedRead).mockResolvedValue(longContent)

		const singleFile = [
			{ path: "long.md", name: "long", parent: null, nodeCount: 1, lastProcessed: 1 },
		]
		await workspaceQuestions(mockClient, mockVault, singleFile)

		const [[, context]] = vi.mocked(mockClient.createJSONCompletion).mock.calls
		expect(context).toContain("(truncated)")
		expect(context).toContain("a".repeat(1000))
		expect(context).not.toContain("a".repeat(1001))
	})

	it("should handle missing files gracefully", async () => {
		const mockQuestions: WorkspaceQuestion[] = []

		vi.mocked(mockClient.createJSONCompletion).mockResolvedValue({ questions: mockQuestions })
		vi.mocked(mockVault.getFileByPath).mockReturnValue(null)

		const singleFile = [
			{ path: "missing.md", name: "missing", parent: null, nodeCount: 1, lastProcessed: 1 },
		]
		await workspaceQuestions(mockClient, mockVault, singleFile)

		const [[, context]] = vi.mocked(mockClient.createJSONCompletion).mock.calls
		expect(context).toContain("### Source 1\n\n")
	})

	it("should sample at most 10 files", async () => {
		const mockQuestions: WorkspaceQuestion[] = [
			{ content: "Sample question?", theme: "sample" },
		]

		vi.mocked(mockClient.createJSONCompletion).mockResolvedValue({ questions: mockQuestions })

		mockFiles.forEach((file) => {
			const mockFile = { path: file.path } as TFile
			vi.mocked(mockVault.getFileByPath).mockReturnValue(mockFile)
			vi.mocked(mockVault.cachedRead).mockResolvedValue("File content")
		})

		await workspaceQuestions(mockClient, mockVault, mockFiles)

		expect(mockVault.getFileByPath).toHaveBeenCalledTimes(10)
		expect(mockVault.cachedRead).toHaveBeenCalledTimes(10)
	})

	it("should handle empty file list", async () => {
		const mockQuestions: WorkspaceQuestion[] = []
		vi.mocked(mockClient.createJSONCompletion).mockResolvedValue({ questions: mockQuestions })

		const result = await workspaceQuestions(mockClient, mockVault, [])

		expect(result).toEqual([])
		expect(mockClient.createJSONCompletion).toHaveBeenCalledWith(
			WORKSPACE_QUESTIONS_PROMPT,
			"",
			{
				temperature: "creative",
				maxTokens: 4096,
			},
		)
	})
})
