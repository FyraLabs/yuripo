import { REPOMD_PAIR_TTL_SECONDS } from "./cache-policy";
import { toDownloadResponse } from "./download";
import { encodeKey } from "./paths";
import type { Bucket } from "./s3/client";

type StoredFile = {
	body: string;
	headers: [string, string][];
};

type RepomdPair = {
	repomd: StoredFile;
	signature: StoredFile | null;
};

const SIGNATURE_SUFFIX = ".asc";
const STORED_HEADERS = ["content-type", "etag", "last-modified"];

export async function serveRepomd(
	bucket: Bucket,
	key: string,
	request: Request,
	waitUntil: (promise: Promise<unknown>) => void,
) {
	const isSignature = key.endsWith(SIGNATURE_SUFFIX);
	const repomdKey = isSignature ? key.slice(0, -SIGNATURE_SUFFIX.length) : key;
	const pair = await loadPair(bucket, repomdKey, request.url, waitUntil);
	const file = isSignature ? pair?.signature : pair?.repomd;
	if (!file) {
		return null;
	}

	const headers = new Headers(file.headers);
	if (matchesIfNoneMatch(request.headers.get("if-none-match"), headers.get("etag"))) {
		return toDownloadResponse(new Response(null, { status: 304, headers }), key);
	}
	const body = request.method === "HEAD" ? null : file.body;
	headers.set("content-length", String(new TextEncoder().encode(file.body).byteLength));
	return toDownloadResponse(new Response(body, { headers }), key);
}

async function loadPair(
	bucket: Bucket,
	repomdKey: string,
	requestUrl: string,
	waitUntil: (promise: Promise<unknown>) => void,
): Promise<RepomdPair | null> {
	const cacheKey = pairCacheKey(requestUrl, repomdKey);
	const cached = await caches.default.match(cacheKey);
	if (cached) {
		return cached.json();
	}

	const [repomd, signature] = await Promise.all([
		fetchStoredFile(bucket, repomdKey),
		fetchStoredFile(bucket, repomdKey + SIGNATURE_SUFFIX),
	]);
	if (!repomd) {
		return null;
	}

	const pair: RepomdPair = { repomd, signature };
	const stored = Response.json(pair, {
		headers: { "cache-control": `public, max-age=${REPOMD_PAIR_TTL_SECONDS}` },
	});
	waitUntil(caches.default.put(cacheKey, stored).catch(() => undefined));
	return pair;
}

async function fetchStoredFile(bucket: Bucket, key: string): Promise<StoredFile | null> {
	const response = await bucket.get(key, { method: "GET", headers: new Headers() });
	if (!response) {
		return null;
	}
	const headers = STORED_HEADERS.flatMap((name): [string, string][] => {
		const value = response.headers.get(name);
		return value ? [[name, value]] : [];
	});
	return { body: await response.text(), headers };
}

function pairCacheKey(requestUrl: string, repomdKey: string) {
	const url = new URL(requestUrl);
	url.pathname = `/${encodeKey(repomdKey)}`;
	url.search = "?repomd-pair";
	return url.toString();
}

function matchesIfNoneMatch(ifNoneMatch: string | null, etag: string | null) {
	if (!(ifNoneMatch && etag)) {
		return false;
	}
	return ifNoneMatch
		.split(",")
		.map((tag) => tag.trim().replace(/^W\//, ""))
		.some((tag) => tag === "*" || tag === etag);
}
