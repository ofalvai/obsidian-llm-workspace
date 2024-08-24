import type { IncomingMessage } from "node:http"
import { request } from "node:https"
import { Readable } from "node:stream"

// A fetch()-like function that uses `node:https` under the hood to circumvent CORS restrictions.
// It returns a Node Readable stream with the response body to allow streaming the response
// as it arrives.
export async function nodeStreamingFetch(url: string, options: any = {}, abortSignal: AbortSignal): Promise<Readable> {
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
				if (abortSignal.aborted) {
					readable.push(null)
				} else {
					readable.push(chunk)
				}
			})

			res.on("end", () => {
				// All data is consumed from the response stream
				readable.push(null)
				cleanup()
			})
			readable.on("error", (e) => {
				cleanup()
				reject(e)
			})
			readable.on("close", () => {
				// No more events, stream is closed
				cleanup()
			})
		})

		const onAbort = () => {
			req.end()
			cleanup()
		}
		abortSignal.addEventListener("abort", onAbort)

		const cleanup = () => {
			abortSignal.removeEventListener("abort", onAbort)
			req.removeAllListeners()
		}

		req.on("error", (error) => {
			reject(error)
		})
		req.on("close", () => {
			cleanup()
		})

		if (options.body) {
			req.write(options.body)
		}

		req.end()
	})
}
