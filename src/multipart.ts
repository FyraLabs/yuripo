import type { ByteRange, FetchWindow } from "./ranges";

type MultipartOptions = {
	windows: FetchWindow[];
	size: number;
	contentType: string;
	fetchWindow: (window: FetchWindow) => Promise<Response>;
};

const encoder = new TextEncoder();

export function multipartByteranges({ windows, size, contentType, fetchWindow }: MultipartOptions) {
	const boundary = crypto.randomUUID().replaceAll("-", "");
	const partHeader = (part: ByteRange) =>
		encoder.encode(
			`\r\n--${boundary}\r\nContent-Type: ${contentType}\r\nContent-Range: bytes ${part.start}-${part.end}/${size}\r\n\r\n`,
		);
	const closing = encoder.encode(`\r\n--${boundary}--\r\n`);

	const parts = windows.flatMap((window) => window.parts);
	const contentLength =
		parts.reduce((total, part) => total + partHeader(part).byteLength + part.end - part.start + 1, 0) +
		closing.byteLength;

	async function* chunks() {
		for (const window of windows) {
			const cursor = new ByteCursor(await fetchWindow(window), window.start);
			try {
				for (const part of window.parts) {
					yield partHeader(part);
					yield* cursor.read(part);
				}
			} finally {
				await cursor.close();
			}
		}
		yield closing;
	}

	const { readable, writable } = new FixedLengthStream(contentLength);
	streamFrom(chunks())
		.pipeTo(writable)
		.catch(() => undefined);

	return {
		body: readable,
		contentLength,
		contentType: `multipart/byteranges; boundary=${boundary}`,
	};
}

class ByteCursor {
	private readonly reader: ReadableStreamDefaultReader<Uint8Array>;
	private buffer: Uint8Array = new Uint8Array(0);
	private offset: number;

	constructor(response: Response, expectedStart: number) {
		if (!response.body) {
			throw new Error("Upstream range response had no body");
		}
		this.reader = response.body.getReader();
		this.offset = response.status === 206 ? startOfContentRange(response, expectedStart) : 0;
	}

	async *read({ start, end }: ByteRange) {
		while (this.offset <= end) {
			if (this.buffer.byteLength === 0) {
				const { done, value } = await this.reader.read();
				if (done) {
					throw new Error("Upstream ended before the requested range was complete");
				}
				this.buffer = value;
				continue;
			}

			const bufferStart = this.offset;
			const from = Math.max(start - bufferStart, 0);
			const to = Math.min(end - bufferStart + 1, this.buffer.byteLength);

			const overlapsRange = from < to;
			if (overlapsRange) {
				yield this.buffer.subarray(from, to);
			}
			const consumed = overlapsRange ? to : this.buffer.byteLength;
			this.offset = bufferStart + consumed;
			this.buffer = this.buffer.subarray(consumed);
		}
	}

	async close() {
		await this.reader.cancel().catch(() => undefined);
	}
}

function startOfContentRange(response: Response, fallback: number) {
	const match = /bytes (\d+)-/.exec(response.headers.get("content-range") ?? "");
	return match?.[1] ? Number(match[1]) : fallback;
}

function streamFrom(iterator: AsyncGenerator<Uint8Array>) {
	return new ReadableStream<Uint8Array>({
		async pull(controller) {
			const { done, value } = await iterator.next();
			if (done) {
				controller.close();
			} else {
				controller.enqueue(value);
			}
		},
		async cancel() {
			await iterator.return(undefined);
		},
	});
}
