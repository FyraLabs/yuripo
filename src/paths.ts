export function encodeKey(key: string) {
	return key.split("/").map(encodeURIComponent).join("/");
}

export function hrefFor(key: string) {
	return `/${encodeKey(key)}`;
}

export function keyFromPathname(pathname: string) {
	return pathname.slice(1).split("/").map(decodeURIComponent).join("/");
}

export function isFolderKey(key: string) {
	return key === "" || key.endsWith("/");
}

export function parentOf(prefix: string) {
	const trimmed = prefix.slice(0, -1);
	const lastSlash = trimmed.lastIndexOf("/");
	return lastSlash === -1 ? "" : trimmed.slice(0, lastSlash + 1);
}

export type Crumb = { name: string; prefix: string };

export function crumbsFor(prefix: string): Crumb[] {
	const segments = prefix.split("/").filter(Boolean);
	return segments.map((name, index) => ({
		name,
		prefix: `${segments.slice(0, index + 1).join("/")}/`,
	}));
}
