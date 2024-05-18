// Various primitives for working with Server-Sent Events (SSE).
// Heavily inspired by the OpenAI streaming handler:
// https://github.com/openai/openai-node/blob/d7d5610d91573740d7e3c27e4afde5650ee6e349/src/streaming.ts
// But way simpler because we assume the Obsidian plugin environment (a modern Node version + modern V8 via Electron)

export type ServerSentEvent = {
	event: string | null
	data: string
	raw: string[]
}

export async function* iterSSEMessages(
	responseStream: AsyncIterable<Uint8Array>,
): AsyncGenerator<ServerSentEvent, void, unknown> {
	const sseDecoder = new SSEDecoder()
	const lineDecoder = new LineDecoder()

	for await (const sseChunk of responseStream) {
		for (const line of lineDecoder.decode(sseChunk)) {
			const sse = sseDecoder.decode(line)
			if (sse) yield sse
		}
	}

	for (const line of lineDecoder.flush()) {
		const sse = sseDecoder.decode(line)
		if (sse) yield sse
	}
}

class SSEDecoder {
	private data: string[]
	private event: string | null
	private chunks: string[]

	constructor() {
		this.event = null
		this.data = []
		this.chunks = []
	}

	decode(line: string) {
		if (line.endsWith("\r")) {
			line = line.substring(0, line.length - 1)
		}

		// end of message, it's time to assemble from parts and return
		if (!line) {
			// empty line and we didn't previously encounter any messages
			if (!this.event && !this.data.length) return null

			const sse: ServerSentEvent = {
				event: this.event,
				data: this.data.join("\n"),
				raw: this.chunks,
			}

			this.event = null
			this.data = []
			this.chunks = []

			return sse
		}

		this.chunks.push(line)

		if (line.startsWith(":")) {
			// comment line, ignore
			return null
		}

		const index = line.indexOf(":")
		if (index === -1) {
			return null
		}
		const field = line.substring(0, index)
		let value = line.substring(index + 1)

		if (value.startsWith(" ")) {
			value = value.substring(1)
		}

		if (field === "event") {
			this.event = value
		} else if (field === "data") {
			this.data.push(value)
		}

		return null
	}
}

/**
 * A re-implementation of httpx's `LineDecoder` in Python that handles incrementally
 * reading lines from text.
 *
 * https://github.com/encode/httpx/blob/920333ea98118e9cf617f246905d7b202510941c/httpx/_decoders.py#L258
 */
class LineDecoder {
	static NEWLINE_CHARS = new Set(["\n", "\r"])
	static NEWLINE_REGEXP = /\r\n|[\n\r]/g

	buffer: string[]
	trailingCR: boolean

	constructor() {
		this.buffer = []
		this.trailingCR = false
	}

	decode(chunk: Uint8Array): string[] {
		let text = new TextDecoder("utf8").decode(chunk)

		if (this.trailingCR) {
			text = "\r" + text
			this.trailingCR = false
		}
		if (text.endsWith("\r")) {
			this.trailingCR = true
			text = text.slice(0, -1)
		}

		if (!text) {
			return []
		}

		const trailingNewline = LineDecoder.NEWLINE_CHARS.has(text[text.length - 1] || "")
		let lines = text.split(LineDecoder.NEWLINE_REGEXP)

		// if there is a trailing new line then the last entry will be an empty
		// string which we don't care about
		if (trailingNewline) {
			lines.pop()
		}

		if (lines.length === 1 && !trailingNewline) {
			this.buffer.push(lines[0]!)
			return []
		}

		if (this.buffer.length > 0) {
			lines = [this.buffer.join("") + lines[0], ...lines.slice(1)]
			this.buffer = []
		}

		if (!trailingNewline) {
			this.buffer = [lines.pop() || ""]
		}

		return lines
	}

	flush(): string[] {
		if (!this.buffer.length && !this.trailingCR) {
			return []
		}

		const lines = [this.buffer.join("")]
		this.buffer = []
		this.trailingCR = false
		return lines
	}
}
