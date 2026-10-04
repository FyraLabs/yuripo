export type Bindings = {
	SITE_NAME?: string;
	S3_ENDPOINT?: string;
	S3_BUCKET?: string;
	S3_REGION?: string;
	S3_ACCESS_KEY_ID?: string;
	S3_SECRET_ACCESS_KEY?: string;
	S3_PATH_STYLE?: string;
	PLAUSIBLE_DOMAIN?: string;
	PLAUSIBLE_HOST?: string;
};

export type BucketConfig = {
	endpoint: URL;
	bucket: string;
	region: string;
	accessKeyId: string;
	secretAccessKey: string;
	pathStyle: boolean;
};

export class ConfigError extends Error {
	constructor(readonly missing: string[]) {
		super(`Missing required environment variables: ${missing.join(", ")}`);
	}
}

const REQUIRED = ["S3_ENDPOINT", "S3_BUCKET", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"] as const;

export function readBucketConfig(env: Bindings): BucketConfig {
	const missing = REQUIRED.filter((name) => !env[name]);
	if (missing.length > 0) {
		throw new ConfigError(missing);
	}

	return {
		endpoint: new URL(env.S3_ENDPOINT as string),
		bucket: env.S3_BUCKET as string,
		region: env.S3_REGION || "auto",
		accessKeyId: env.S3_ACCESS_KEY_ID as string,
		secretAccessKey: env.S3_SECRET_ACCESS_KEY as string,
		pathStyle: env.S3_PATH_STYLE !== "false",
	};
}
