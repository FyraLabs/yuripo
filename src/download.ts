import { multipartByteranges } from "./multipart";
import {
	type ByteRange,
	coalesceRanges,
	ifRangeMatches,
	parseRangeHeader,
	planFetchWindows,
	type RangeSpec,
	resolveRanges,
} from "./ranges";
import type { Bucket } from "./s3/client";

const CONDITIONAL_REQUEST_HEADERS = [
	"if-match",
	"if-none-match",
	"if-modified-since",
	"if-unmodified-since",
];

const PASSTHROUGH_RESPONSE_HEADERS = [
	"content-type",
	"content-length",
	"content-range",
	"accept-ranges",
	"etag",
	"last-modified",
	"cache-control",
	"content-encoding",
];

const MAX_RANGE_SPECS = 1024;
const WINDOW_PLAN = { maxGap: 64 * 1024, maxWindows: 16 };

export async function serveObject(bucket: Bucket, key: string, request: Request) {
	const method = request.method === "HEAD" ? "HEAD" : "GET";
	const rangeHeader = request.headers.get("range");
	const specs = rangeHeader ? parseRangeHeader(rangeHeader) : null;
	const conditionals = pickHeaders(request.headers, CONDITIONAL_REQUEST_HEADERS);

	if (specs && specs.length > 1 && specs.length <= MAX_RANGE_SPECS && method === "GET") {
		return serveMultipleRanges(bucket, key, request, specs, conditionals);
	}

	if (specs?.length === 1 && rangeHeader) {
		conditionals.set("range", rangeHeader);
		copyHeader(request.headers, conditionals, "if-range");
	}

	const upstream = await bucket.get(key, { method, headers: conditionals });
	return upstream && toDownloadResponse(upstream, key);
}

async function serveMultipleRanges(
	bucket: Bucket,
	key: string,
	request: Request,
	specs: RangeSpec[],
	conditionals: Headers,
) {
	const head = await bucket.get(key, { method: "HEAD", headers: conditionals });
	if (!head || head.status !== 200) {
		return head && toDownloadResponse(head, key);
	}

	const size = Number(head.headers.get("content-length"));
	const etag = head.headers.get("etag");

	if (!ifRangeMatches(request.headers.get("if-range"), etag, head.headers.get("last-modified"))) {
		const full = await bucket.get(key, { method: "GET", headers: conditionals });
		return full && toDownloadResponse(full, key);
	}

	const ranges = coalesceRanges(resolveRanges(specs, size));
	const pinned = (range: ByteRange) => {
		const headers = new Headers({ range: `bytes=${range.start}-${range.end}` });
		if (etag) {
			headers.set("if-match", etag);
		}
		return headers;
	};

	if (ranges.length === 0) {
		const headers = downloadHeaders(head.headers, key);
		headers.delete("content-length");
		headers.delete("content-type");
		headers.set("content-range", `bytes */${size}`);
		return new Response(null, { status: 416, headers });
	}

	if (ranges.length === 1) {
		const single = await bucket.get(key, { method: "GET", headers: pinned(ranges[0] as ByteRange) });
		return single && toDownloadResponse(single, key);
	}

	const multipart = multipartByteranges({
		windows: planFetchWindows(ranges, WINDOW_PLAN),
		size,
		contentType: head.headers.get("content-type") ?? "application/octet-stream",
		fetchWindow: async (window) => {
			const response = await bucket.get(key, { method: "GET", headers: pinned(window) });
			if (!response || (response.status !== 200 && response.status !== 206)) {
				throw new Error(`Object changed or vanished while serving ranges (${response?.status ?? 404})`);
			}
			return response;
		},
	});

	const headers = downloadHeaders(head.headers, key);
	headers.set("content-type", multipart.contentType);
	headers.set("content-length", String(multipart.contentLength));
	return new Response(multipart.body, { status: 206, headers });
}

export function toDownloadResponse(upstream: Response, key: string) {
	return new Response(upstream.body, {
		status: upstream.status,
		headers: downloadHeaders(upstream.headers, key),
	});
}

function downloadHeaders(upstreamHeaders: Headers, key: string) {
	const headers = pickHeaders(upstreamHeaders, PASSTHROUGH_RESPONSE_HEADERS);
	if (!headers.has("content-type")) {
		headers.set("content-type", "application/octet-stream");
	}
	headers.set("accept-ranges", "bytes");
	headers.set("content-disposition", inlineDisposition(key));
	headers.set("x-content-type-options", "nosniff");
	headers.set("content-security-policy", "sandbox");
	return headers;
}

function pickHeaders(source: Headers, names: string[]) {
	const picked = new Headers();
	for (const name of names) {
		copyHeader(source, picked, name);
	}
	return picked;
}

function copyHeader(source: Headers, target: Headers, name: string) {
	const value = source.get(name);
	if (value) {
		target.set(name, value);
	}
}

function inlineDisposition(key: string) {
	const filename = key.slice(key.lastIndexOf("/") + 1);
	const asciiFallback = filename.replace(/[^\x20-\x7e]|["\\]/g, "_");
	return `inline; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}
