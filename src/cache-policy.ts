export type CachePolicy = {
	cacheControl: string;
	edgeTtlSeconds: number;
};

const ONE_MINUTE = 60;
const ONE_WEEK = 7 * 24 * 60 * 60;
const ONE_YEAR = 365 * 24 * 60 * 60;

const CONTENT_ADDRESSED: CachePolicy = {
	cacheControl: `public, max-age=${ONE_YEAR}, immutable`,
	edgeTtlSeconds: ONE_YEAR,
};

const PACKAGE: CachePolicy = {
	cacheControl: `public, max-age=${ONE_WEEK}`,
	edgeTtlSeconds: ONE_WEEK,
};

export const REPOMD_PAIR_TTL_SECONDS = ONE_MINUTE;

const SIGNED_REPOMD: CachePolicy = {
	cacheControl: "public, no-cache",
	edgeTtlSeconds: 0,
};

const MUTABLE: CachePolicy = {
	cacheControl: `public, max-age=${ONE_MINUTE}`,
	edgeTtlSeconds: ONE_MINUTE,
};

export const LISTING: CachePolicy = {
	cacheControl: `public, max-age=${ONE_MINUTE}`,
	edgeTtlSeconds: ONE_MINUTE,
};

const SIGNED_REPOMD_FILE = /(^|\/)repodata\/repomd\.xml(\.asc)?$/;
const HASH_PREFIXED_REPODATA = /(^|\/)repodata\/[0-9a-f]{32,}-[^/]+$/;
const PACKAGE_EXTENSIONS = [".rpm", ".drpm"];

export function isSignedRepomdKey(key: string) {
	return SIGNED_REPOMD_FILE.test(key);
}

export function cachePolicyFor(key: string): CachePolicy {
	if (isSignedRepomdKey(key)) {
		return SIGNED_REPOMD;
	}
	if (HASH_PREFIXED_REPODATA.test(key)) {
		return CONTENT_ADDRESSED;
	}
	if (PACKAGE_EXTENSIONS.some((extension) => key.endsWith(extension))) {
		return PACKAGE;
	}
	return MUTABLE;
}

export function edgeCacheOptions({ edgeTtlSeconds }: CachePolicy): RequestInit["cf"] {
	if (edgeTtlSeconds === 0) {
		return undefined;
	}
	return {
		cacheEverything: true,
		cacheTtlByStatus: { "200-299": edgeTtlSeconds, "300-599": 0 },
	};
}
