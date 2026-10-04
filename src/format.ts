const UNITS = ["B", "KB", "MB", "GB", "TB", "PB"];

export function formatBytes(bytes: number) {
	if (bytes < 1024) {
		return `${bytes} B`;
	}
	const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), UNITS.length - 1);
	const value = bytes / 1024 ** exponent;
	return `${value.toFixed(value < 10 ? 1 : 0)} ${UNITS[exponent]}`;
}

const dateFormat = new Intl.DateTimeFormat("en", {
	dateStyle: "medium",
	timeStyle: "short",
	timeZone: "UTC",
});

export function formatDate(date: Date) {
	return `${dateFormat.format(date)} UTC`;
}

export function pluralize(count: number, singular: string, plural = `${singular}s`) {
	return `${count} ${count === 1 ? singular : plural}`;
}
