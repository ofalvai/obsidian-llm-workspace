import type { LocalModels } from "./types"

export async function listLoadableModels(url: string): Promise<LocalModels> {
	if (!url) {
		return Promise.reject("No URL provided")
	}

	if (url.endsWith("/")) {
		url = url.slice(0, -1)
	}

	const response = await fetch(`${url}/api/tags`)
	const data = (await response.json()) as LocalModels
	return data
}
