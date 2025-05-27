/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { cosineSimilarity, VectorStoreIndex } from './vectorstore'
import type { LlmDexie, VectorStoreEntry } from 'src/storage/db'
import type { Node } from './node'

describe('cosineSimilarity', () => {
	it('should return 1 for identical vectors', () => {
		const vector1 = [1, 0, 0]
		const vector2 = [1, 0, 0]
		
		expect(cosineSimilarity(vector1, vector2)).toBe(1)
	})

	it('should return 0 for orthogonal vectors', () => {
		const vector1 = [1, 0, 0]
		const vector2 = [0, 1, 0]
		
		expect(cosineSimilarity(vector1, vector2)).toBe(0)
	})

	it('should return correct similarity for partially similar vectors', () => {
		const vector1 = [0.5, 0.5, 0]
		const vector2 = [0.5, 0, 0.5]
		
		expect(cosineSimilarity(vector1, vector2)).toBeCloseTo(0.5)
	})

	it('should handle zero vectors', () => {
		const vector1 = [0, 0, 0]
		const vector2 = [1, 1, 1]
		
		expect(cosineSimilarity(vector1, vector2)).toBe(0)
	})

	it('should handle normalized embedding vectors', () => {
		// Typical embedding vectors with small decimal values
		const vector1 = [0.1, 0.2, 0.3, 0.4]
		const vector2 = [0.4, 0.3, 0.2, 0.1]
		
		expect(cosineSimilarity(vector1, vector2)).toBeCloseTo(0.67)
	})

	it('should handle single dimension vectors', () => {
		const vector1 = [0.8]
		const vector2 = [0.6]
		
		expect(cosineSimilarity(vector1, vector2)).toBeCloseTo(0.48)
	})
	it('should handle non-normalized vectors', () => {
		const vector1 = [123, 456, 789]
		const vector2 = [-987, 666, -333]
		
		expect(cosineSimilarity(vector1, vector2)).toBeCloseTo(-0.07)
	})
})

describe('VectorStoreIndex.query', () => {
	let vectorStore: VectorStoreIndex
	let mockDb: LlmDexie
	let mockVectorStoreTable: any

	beforeEach(() => {
		mockVectorStoreTable = {
			where: vi.fn().mockReturnThis(),
			equals: vi.fn().mockReturnThis(),
			toArray: vi.fn()
		}

		mockDb = {
			vectorStore: mockVectorStoreTable
		} as any

		vectorStore = new VectorStoreIndex(mockDb)
	})

	it('should return nodes sorted by similarity in descending order', async () => {
		const queryEmbedding = [1, 0, 0]
		const workspacePath = 'workspace.md'
		
		const mockEntries: VectorStoreEntry[] = [
			{
				node: { content: 'Node A', parent: 'a.md', createdAt: 1000 } as Node,
				includedInWorkspace: [workspacePath],
				embedding: [0.8, 0.2, 0] // similarity: 0.8
			},
			{
				node: { content: 'Node B', parent: 'b.md', createdAt: 2000 } as Node,
				includedInWorkspace: [workspacePath],
				embedding: [0.9, 0.1, 0] // similarity: 0.9
			},
			{
				node: { content: 'Node C', parent: 'c.md', createdAt: 3000 } as Node,
				includedInWorkspace: [workspacePath],
				embedding: [0.5, 0.5, 0] // similarity: 0.5
			}
		]

		mockVectorStoreTable.toArray.mockResolvedValue(mockEntries)

		const result = await vectorStore.query(queryEmbedding, workspacePath, 3)

		expect(mockVectorStoreTable.where).toHaveBeenCalledWith('includedInWorkspace')
		expect(mockVectorStoreTable.equals).toHaveBeenCalledWith(workspacePath)
		
		expect(result).toHaveLength(3)
		expect(result[0].node.content).toBe('Node B')
		expect(result[0].similarity).toBeCloseTo(0.9, 2)
		expect(result[1].node.content).toBe('Node A')
		expect(result[1].similarity).toBeCloseTo(0.8, 2)
		expect(result[2].node.content).toBe('Node C')
		expect(result[2].similarity).toBeCloseTo(0.5, 2)
	})

	it('should respect the limit parameter', async () => {
		const queryEmbedding = [1, 0]
		const workspacePath = 'workspace.md'
		
		const mockEntries: VectorStoreEntry[] = [
			{
				node: { content: 'Node A', parent: 'a.md', createdAt: 1000 } as Node,
				includedInWorkspace: [workspacePath],
				embedding: [0.8, 0.2]
			},
			{
				node: { content: 'Node B', parent: 'b.md', createdAt: 2000 } as Node,
				includedInWorkspace: [workspacePath],
				embedding: [0.9, 0.1]
			},
			{
				node: { content: 'Node C', parent: 'c.md', createdAt: 3000 } as Node,
				includedInWorkspace: [workspacePath],
				embedding: [0.5, 0.5]
			}
		]

		mockVectorStoreTable.toArray.mockResolvedValue(mockEntries)

		const result = await vectorStore.query(queryEmbedding, workspacePath, 2)

		expect(result).toHaveLength(2)
		expect(result[0].node.content).toBe('Node B') // highest similarity
		expect(result[1].node.content).toBe('Node A') // second highest
	})

	it('should handle empty results', async () => {
		const queryEmbedding = [1, 0, 0]
		const workspacePath = 'workspace.md'

		mockVectorStoreTable.toArray.mockResolvedValue([])

		const result = await vectorStore.query(queryEmbedding, workspacePath, 5)

		expect(result).toHaveLength(0)
		expect(result).toEqual([])
	})

	it('should handle single result', async () => {
		const queryEmbedding = [1, 0]
		const workspacePath = 'workspace.md'
		
		const mockEntries: VectorStoreEntry[] = [
			{
				node: { content: 'Only Node', parent: 'only.md', createdAt: 1000 } as Node,
				includedInWorkspace: [workspacePath],
				embedding: [0.7, 0.3]
			}
		]

		mockVectorStoreTable.toArray.mockResolvedValue(mockEntries)

		const result = await vectorStore.query(queryEmbedding, workspacePath, 5)

		expect(result).toHaveLength(1)
		expect(result[0].node.content).toBe('Only Node')
		expect(result[0].similarity).toBeCloseTo(0.7, 2)
	})

	it('should filter by workspace correctly', async () => {
		const queryEmbedding = [1, 0]
		const workspacePath = 'specific-workspace.md'

		mockVectorStoreTable.toArray.mockResolvedValue([])

		await vectorStore.query(queryEmbedding, workspacePath, 10)

		expect(mockVectorStoreTable.where).toHaveBeenCalledWith('includedInWorkspace')
		expect(mockVectorStoreTable.equals).toHaveBeenCalledWith(workspacePath)
		expect(mockVectorStoreTable.toArray).toHaveBeenCalled()
	})

	it('should handle limit larger than available results', async () => {
		const queryEmbedding = [1, 0]
		const workspacePath = 'workspace.md'
		
		const mockEntries: VectorStoreEntry[] = [
			{
				node: { content: 'Node A', parent: 'a.md', createdAt: 1000 } as Node,
				includedInWorkspace: [workspacePath],
				embedding: [0.8, 0.2]
			}
		]

		mockVectorStoreTable.toArray.mockResolvedValue(mockEntries)

		const result = await vectorStore.query(queryEmbedding, workspacePath, 10)

		expect(result).toHaveLength(1)
		expect(result[0].node.content).toBe('Node A')
	})
})

describe('VectorStoreIndex.updateWorkspacePath', () => {
	let vectorStore: VectorStoreIndex
	let mockDb: LlmDexie
	let mockVectorStoreTable: any

	beforeEach(() => {
		mockVectorStoreTable = {
			where: vi.fn().mockReturnThis(),
			equals: vi.fn().mockReturnThis(),
			modify: vi.fn()
		}

		mockDb = {
			vectorStore: mockVectorStoreTable
		} as any

		vectorStore = new VectorStoreIndex(mockDb)
	})

	it('should correctly map workspace paths in the modify function', async () => {
		const oldPath = 'old-workspace.md'
		const newPath = 'new-workspace.md'
		let capturedModifyFunction: any

		mockVectorStoreTable.modify.mockImplementation((fn: any) => {
			capturedModifyFunction = fn
			return Promise.resolve()
		})

		await vectorStore.updateWorkspacePath(oldPath, newPath)

		// Test the modify function with a mock entry
		const mockEntry: VectorStoreEntry = {
			node: { content: 'test', parent: 'test.md', createdAt: 1000 } as Node,
			includedInWorkspace: [oldPath, 'other-workspace.md'],
			embedding: [1, 0, 0]
		}

		capturedModifyFunction(mockEntry)

		expect(mockEntry.includedInWorkspace).toEqual([newPath, 'other-workspace.md'])
	})

	it('should handle entries with multiple workspace paths', async () => {
		const oldPath = 'old-workspace.md'
		const newPath = 'new-workspace.md'
		let capturedModifyFunction: any

		mockVectorStoreTable.modify.mockImplementation((fn: any) => {
			capturedModifyFunction = fn
			return Promise.resolve()
		})

		await vectorStore.updateWorkspacePath(oldPath, newPath)

		const mockEntry: VectorStoreEntry = {
			node: { content: 'test', parent: 'test.md', createdAt: 1000 } as Node,
			includedInWorkspace: [oldPath, 'workspace2.md', oldPath, 'workspace3.md'],
			embedding: [1, 0, 0]
		}

		capturedModifyFunction(mockEntry)

		expect(mockEntry.includedInWorkspace).toEqual([newPath, 'workspace2.md', newPath, 'workspace3.md'])
	})

	it('should leave unchanged paths untouched', async () => {
		const oldPath = 'old-workspace.md'
		const newPath = 'new-workspace.md'
		let capturedModifyFunction: any

		mockVectorStoreTable.modify.mockImplementation((fn: any) => {
			capturedModifyFunction = fn
			return Promise.resolve()
		})

		await vectorStore.updateWorkspacePath(oldPath, newPath)

		const mockEntry: VectorStoreEntry = {
			node: { content: 'test', parent: 'test.md', createdAt: 1000 } as Node,
			includedInWorkspace: ['workspace1.md', 'workspace2.md'],
			embedding: [1, 0, 0]
		}

		capturedModifyFunction(mockEntry)

		expect(mockEntry.includedInWorkspace).toEqual(['workspace1.md', 'workspace2.md'])
	})
})
