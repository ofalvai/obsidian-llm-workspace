export interface Node {
	content: string;
	parentFilePath: string;
}

export interface NodeParserConfig {
	chunkSize: number;
	paragraphSeparator: string;
}

export class NodeParser {
	private config: NodeParserConfig;

	constructor(config: NodeParserConfig) {
		this.config = config;
	}

	static defaultConfig(): NodeParserConfig {
		return {
			chunkSize: 1024,
			paragraphSeparator: "\n\n",
		};
	}

	parse(text: string, path: string): Node[] {
		const paragraphSplits = text.split(this.config.paragraphSeparator);

		// merge paragraphs that are too small
		let idx = 0;
		while (idx < paragraphSplits.length) {
			if (
				idx < paragraphSplits.length - 1 &&
				paragraphSplits[idx].length < this.config.chunkSize
			) {
				paragraphSplits[idx] = [
					paragraphSplits[idx],
					paragraphSplits[idx + 1],
				].join(this.config.paragraphSeparator);
				paragraphSplits.splice(idx + 1, 1);
			} else {
				idx += 1;
			}
		}

		return paragraphSplits.map((paragraph) => {
			return {
				content: paragraph,
				parentFilePath: path,
			};
		});
	}
}