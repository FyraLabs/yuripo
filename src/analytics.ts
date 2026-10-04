import type { Bindings } from "./env";

export type PlausibleConfig = {
	domain: string;
	host: string;
};

const DEFAULT_HOST = "https://plausible.fyralabs.com";

export function readPlausibleConfig(env: Bindings): PlausibleConfig | null {
	if (!env.PLAUSIBLE_DOMAIN) {
		return null;
	}
	return {
		domain: env.PLAUSIBLE_DOMAIN,
		host: (env.PLAUSIBLE_HOST || DEFAULT_HOST).replace(/\/+$/, ""),
	};
}

export function scriptUrl(config: PlausibleConfig) {
	return `${config.host}/js/script.outbound-links.js`;
}

export function isRepoMetadata(key: string) {
	return key.split("/").includes("repodata");
}

export function isNewDownload(request: Request, response: Response) {
	if (request.method !== "GET") {
		return false;
	}
	if (response.status === 200) {
		return true;
	}
	return response.status === 206 && /^bytes 0-/.test(response.headers.get("content-range") ?? "");
}

export async function sendDownloadEvent(config: PlausibleConfig, request: Request, key: string) {
	const headers = new Headers({ "content-type": "application/json" });
	const userAgent = request.headers.get("user-agent");
	const clientIp = request.headers.get("cf-connecting-ip");
	if (userAgent) {
		headers.set("user-agent", userAgent);
	}
	if (clientIp) {
		headers.set("x-forwarded-for", clientIp);
	}

	const response = await fetch(`${config.host}/api/event`, {
		method: "POST",
		headers,
		body: JSON.stringify({
			name: "Download",
			domain: config.domain,
			url: request.url,
			referrer: request.headers.get("referer") ?? undefined,
			props: { file: key },
		}),
	});
	if (!response.ok) {
		console.error(`Plausible rejected download event: HTTP ${response.status}`);
	}
}
