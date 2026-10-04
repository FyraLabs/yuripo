import { AwsClient } from "aws4fetch";
import { XMLParser } from "fast-xml-parser";
import type { BucketConfig } from "../env";
import { encodeKey } from "../paths";

export type Folder = {
	prefix: string;
	name: string;
};

export type FileObject = {
	key: string;
	name: string;
	size: number;
	lastModified: Date;
};

export type Listing = {
	prefix: string;
	folders: Folder[];
	files: FileObject[];
	nextCursor?: string;
};

export class S3Error extends Error {
	constructor(
		readonly status: number,
		readonly code: string,
		message: string,
	) {
		super(message);
	}
}

type RawObject = { Key: string; Size: string; LastModified: string };
type RawPrefix = { Prefix: string };
type RawListResult = {
	IsTruncated?: string;
	NextContinuationToken?: string;
	Contents?: RawObject[];
	CommonPrefixes?: RawPrefix[];
};
type RawError = { Code?: string; Message?: string };

const ARRAY_PATHS = new Set(["ListBucketResult.Contents", "ListBucketResult.CommonPrefixes"]);

const parser = new XMLParser({
	parseTagValue: false,
	ignoreAttributes: true,
	isArray: (_name, jpath) => ARRAY_PATHS.has(String(jpath)),
});

const PAGE_SIZE = 500;

const PASSTHROUGH_STATUSES = new Set([200, 206, 304, 412, 416]);

export class Bucket {
	private readonly aws: AwsClient;

	constructor(private readonly config: BucketConfig) {
		this.aws = new AwsClient({
			accessKeyId: config.accessKeyId,
			secretAccessKey: config.secretAccessKey,
			region: config.region,
			service: "s3",
		});
	}

	get name() {
		return this.config.bucket;
	}

	async list(prefix: string, cursor?: string): Promise<Listing> {
		const url = this.urlFor("");
		url.searchParams.set("list-type", "2");
		url.searchParams.set("delimiter", "/");
		url.searchParams.set("max-keys", String(PAGE_SIZE));
		if (prefix) {
			url.searchParams.set("prefix", prefix);
		}
		if (cursor) {
			url.searchParams.set("continuation-token", cursor);
		}

		const response = await this.aws.fetch(url);
		const body = await response.text();
		if (!response.ok) {
			throw toS3Error(response.status, body);
		}

		const result: RawListResult = parser.parse(body).ListBucketResult ?? {};

		return {
			prefix,
			folders: (result.CommonPrefixes ?? []).map(({ Prefix }) => ({
				prefix: Prefix,
				name: Prefix.slice(prefix.length, -1),
			})),
			files: (result.Contents ?? [])
				.filter(({ Key }) => Key !== prefix)
				.map(({ Key, Size, LastModified }) => ({
					key: Key,
					name: Key.slice(prefix.length),
					size: Number(Size),
					lastModified: new Date(LastModified),
				})),
			nextCursor: result.IsTruncated === "true" ? result.NextContinuationToken : undefined,
		};
	}

	async get(
		key: string,
		{ method, headers }: { method: "GET" | "HEAD"; headers: Headers },
	): Promise<Response | null> {
		const response = await this.aws.fetch(this.urlFor(key), { method, headers });
		if (response.status === 404) {
			return null;
		}
		if (!PASSTHROUGH_STATUSES.has(response.status)) {
			throw toS3Error(response.status, method === "HEAD" ? "" : await response.text());
		}
		return response;
	}

	async hasFolder(prefix: string) {
		const { folders, files } = await this.list(prefix);
		return folders.length > 0 || files.length > 0;
	}

	private urlFor(key: string) {
		const url = new URL(this.config.endpoint);
		if (this.config.pathStyle) {
			url.pathname = `/${this.config.bucket}/${encodeKey(key)}`;
		} else {
			url.hostname = `${this.config.bucket}.${url.hostname}`;
			url.pathname = `/${encodeKey(key)}`;
		}
		return url;
	}
}

function toS3Error(status: number, body: string) {
	const error: RawError = body ? (parser.parse(body).Error ?? {}) : {};
	return new S3Error(
		status,
		error.Code ?? "UnknownError",
		error.Message ?? `The storage provider responded with HTTP ${status}.`,
	);
}
