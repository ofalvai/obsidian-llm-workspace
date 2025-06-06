import path from "node:path"
import type { FilePath } from "src/utils/obsidian"

/**
 * A node represents a chunk of content from a file. Other components of the RAG pipeline reference nodes,
 * not files typically.
 * It's important that a Node is not a reference to a file, but a snapshot of its content at a given time.
 */
export interface Node {
	content: string
	parent: FilePath
	createdAt: number
}

export interface NodeParserConfig {
	chunkSize: number
	paragraphSeparator: string
}

export class NodeParser {
	private config: NodeParserConfig

	constructor(config: NodeParserConfig) {
		this.config = config
	}

	parse(text: string, path: string): Node[] {
		const paragraphSplits = text.split(this.config.paragraphSeparator)

		// merge paragraphs that are too small
		let idx = 0
		while (idx < paragraphSplits.length) {
			if (
				idx < paragraphSplits.length - 1 &&
				paragraphSplits[idx].length < this.config.chunkSize
			) {
				paragraphSplits[idx] = [paragraphSplits[idx], paragraphSplits[idx + 1]].join(
					this.config.paragraphSeparator,
				)
				paragraphSplits.splice(idx + 1, 1)
			} else {
				idx += 1
			}
		}

		return paragraphSplits.map((paragraph) => {
			return {
				content: paragraph,
				parent: path,
				createdAt: new Date().valueOf(),
			}
		})
	}
}

export function nodeRepresentation(node: Node): string {
	const title = path.basename(node.parent, path.extname(node.parent))
	const folder = path.dirname(node.parent)

	let stringValue = ""
	stringValue += `Title: ${title}\n`
	if (folder != ".") {
		stringValue += `Folder: ${folder}\n`
	}
	stringValue += node.content

	return stringValue
}
