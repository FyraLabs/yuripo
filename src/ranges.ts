export type ByteRange = { start: number; end: number };

export type RangeSpec = { start: number; end?: number } | { suffixLength: number };

export type FetchWindow = ByteRange & { parts: ByteRange[] };

const RANGE_SPEC = /^(\d*)-(\d*)$/;

export function parseRangeHeader(header: string): RangeSpec[] | null {
	const match = /^\s*bytes\s*=(.*)$/i.exec(header);
	if (!match?.[1]) {
		return null;
	}

	const specs: RangeSpec[] = [];
	for (const raw of match[1].split(",")) {
		const spec = parseRangeSpec(raw.trim());
		if (!spec) {
			return null;
		}
		specs.push(spec);
	}
	return specs.length > 0 ? specs : null;
}

function parseRangeSpec(raw: string): RangeSpec | null {
	const parts = RANGE_SPEC.exec(raw);
	if (!parts) {
		return null;
	}
	const [, first = "", last = ""] = parts;

	if (first === "") {
		return last === "" ? null : { suffixLength: Number(last) };
	}

	const start = Number(first);
	if (last === "") {
		return { start };
	}
	const end = Number(last);
	return end < start ? null : { start, end };
}

export function resolveRanges(specs: RangeSpec[], size: number): ByteRange[] {
	const resolved: ByteRange[] = [];
	for (const spec of specs) {
		if ("suffixLength" in spec) {
			if (spec.suffixLength > 0 && size > 0) {
				resolved.push({ start: Math.max(0, size - spec.suffixLength), end: size - 1 });
			}
		} else if (spec.start < size) {
			resolved.push({ start: spec.start, end: Math.min(spec.end ?? size - 1, size - 1) });
		}
	}
	return resolved;
}

export function coalesceRanges(ranges: ByteRange[]): ByteRange[] {
	const sorted = [...ranges].sort((a, b) => a.start - b.start);
	const merged: ByteRange[] = [];
	for (const range of sorted) {
		const previous = merged.at(-1);
		if (previous && range.start <= previous.end + 1) {
			previous.end = Math.max(previous.end, range.end);
		} else {
			merged.push({ ...range });
		}
	}
	return merged;
}

export function planFetchWindows(
	ranges: ByteRange[],
	{ maxGap, maxWindows }: { maxGap: number; maxWindows: number },
): FetchWindow[] {
	const windows: FetchWindow[] = [];
	for (const range of ranges) {
		const previous = windows.at(-1);
		if (previous && gapBetween(previous, range) <= maxGap) {
			previous.end = range.end;
			previous.parts.push(range);
		} else {
			windows.push({ ...range, parts: [range] });
		}
	}

	while (windows.length > maxWindows) {
		const index = indexOfSmallestGap(windows);
		const [left, right] = windows.splice(index, 2) as [FetchWindow, FetchWindow];
		windows.splice(index, 0, {
			start: left.start,
			end: right.end,
			parts: [...left.parts, ...right.parts],
		});
	}

	return windows;
}

function gapBetween(left: ByteRange, right: ByteRange) {
	return right.start - left.end - 1;
}

function indexOfSmallestGap(windows: FetchWindow[]) {
	let smallest = 0;
	for (let index = 1; index < windows.length - 1; index++) {
		const current = gapBetween(windows[index] as FetchWindow, windows[index + 1] as FetchWindow);
		const best = gapBetween(windows[smallest] as FetchWindow, windows[smallest + 1] as FetchWindow);
		if (current < best) {
			smallest = index;
		}
	}
	return smallest;
}

export function ifRangeMatches(ifRange: string | null, etag: string | null, lastModified: string | null) {
	if (!ifRange) {
		return true;
	}
	if (ifRange.startsWith('"') || ifRange.startsWith("W/")) {
		return !ifRange.startsWith("W/") && ifRange === etag;
	}
	return lastModified !== null && Date.parse(ifRange) === Date.parse(lastModified);
}
