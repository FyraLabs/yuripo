import { Hono } from "hono";
import { jsxRenderer } from "hono/jsx-renderer";
import { isNewDownload, isRepoMetadata, readPlausibleConfig, sendDownloadEvent } from "./analytics";
import { Breadcrumbs } from "./components/breadcrumbs";
import { Layout } from "./components/layout";
import { ListingTable } from "./components/listing-table";
import { Message } from "./components/message";
import { serveObject } from "./download";
import { type Bindings, ConfigError, readBucketConfig } from "./env";
import { hrefFor, isFolderKey, keyFromPathname } from "./paths";
import { Bucket, S3Error } from "./s3/client";

declare module "hono" {
	interface ContextRenderer {
		(content: string | Promise<string>, props: { title: string }): Response | Promise<Response>;
	}
}

const app = new Hono<{ Bindings: Bindings }>();

app.use(
	jsxRenderer(({ children, title }, c) => (
		<Layout
			plausible={readPlausibleConfig(c.env)}
			siteName={c.env.SITE_NAME || c.env.S3_BUCKET || "Bucket"}
			title={title}
		>
			{children}
		</Layout>
	)),
);

app.get("*", async (c) => {
	const key = keyFromPathname(new URL(c.req.url).pathname);

	const bucket = new Bucket(readBucketConfig(c.env));

	if (!isFolderKey(key)) {
		const object = await serveObject(bucket, key, c.req.raw);
		if (object) {
			const plausible = readPlausibleConfig(c.env);
			if (plausible && !isRepoMetadata(key) && isNewDownload(c.req.raw, object)) {
				c.executionCtx.waitUntil(sendDownloadEvent(plausible, c.req.raw, key));
			}
			return object;
		}
		if (await bucket.hasFolder(`${key}/`)) {
			return c.redirect(hrefFor(`${key}/`), 301);
		}
		c.status(404);
		return c.render(
			<Message title="File not found">
				<p>
					Nothing exists at <code>{key}</code> in this bucket.
				</p>
			</Message>,
			{ title: "Not found" },
		);
	}

	const cursor = c.req.query("cursor");
	const listing = await bucket.list(key, cursor);

	if (key && !cursor && listing.folders.length === 0 && listing.files.length === 0) {
		c.status(404);
		return c.render(
			<Message title="Folder not found">
				<p>
					Nothing exists under <code>{key}</code> in this bucket.
				</p>
			</Message>,
			{ title: "Not found" },
		);
	}

	return c.render(
		<>
			<Breadcrumbs bucket={bucket.name} prefix={key} />
			<ListingTable cursor={cursor} listing={listing} />
		</>,
		{ title: key ? key.slice(0, -1) : bucket.name },
	);
});

app.onError((error, c) => {
	if (error instanceof URIError) {
		c.status(400);
		return c.render(
			<Message title="Malformed path">
				<p>That URL couldn't be decoded into an object key.</p>
			</Message>,
			{ title: "Bad request" },
		);
	}

	if (error instanceof ConfigError) {
		c.status(500);
		return c.render(
			<Message title="The bucket isn't configured">
				<p>Set these environment variables on the worker:</p>
				<ul class="code-list">
					{error.missing.map((name) => (
						<li>
							<code>{name}</code>
						</li>
					))}
				</ul>
			</Message>,
			{ title: "Not configured" },
		);
	}

	if (error instanceof S3Error) {
		c.status(502);
		return c.render(
			<Message title="The bucket returned an error">
				<p>
					{error.message} (<code>{error.code}</code>)
				</p>
			</Message>,
			{ title: "Storage error" },
		);
	}

	console.error(error);
	c.status(500);
	return c.render(
		<Message title="Something went wrong">
			<p>An unexpected error occurred while talking to the bucket.</p>
		</Message>,
		{ title: "Error" },
	);
});

export default app;
