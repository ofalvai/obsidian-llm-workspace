import type { IncomingMessage } from "node:http"
import { request } from "node:https"
import { Readable } from "node:stream"
import { logger } from "./logger"

// A fetch()-like function that uses `node:https` under the hood to circumvent CORS restrictions.
// It returns a Node Readable stream with the response body to allow streaming the response
// as it arrives.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function nodeStreamingFetch(url: string, options: any = {}): Promise<Readable> {
	return new Promise((resolve, reject) => {
		const requestOptions = {
			method: options.method || "GET",
			headers: options.headers || {},
		}

		const readable = new Readable({
			read() {},
		})

		const req = request(url, requestOptions, (res: IncomingMessage) => {
			if (res.statusCode !== 200) {
				let body = ""
				res.on("readable", () => {
					body += res.read()
				})
				res.on("end", () => {
					console.error("Failed request's response body", body)
				})
				reject(new Error(`Unexpected status code: ${res.statusCode}`))
				return
			}

			resolve(readable)

			res.on("data", (chunk) => {
				readable.push(chunk)
			})

			res.on("end", () => {
				readable.push(null)
			})
			readable.on("error", (e) => {
				logger.error("error", "nodeStreamingFetch", e)
				reject(e)
			})
		})

		req.on("error", (error) => {
			reject(error)
		})

		if (options.body) {
			req.write(options.body)
		}

		req.end()
	})
}
