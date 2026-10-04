import type { Child } from "hono/jsx";
import { type PlausibleConfig, scriptUrl } from "../analytics";
import styles from "../styles.css";

const REPOSITORY_URL = "https://github.com/FyraLabs/yuripo";

type LayoutProps = {
	title: string;
	siteName: string;
	plausible: PlausibleConfig | null;
	children: Child;
};

export function Layout({ title, siteName, plausible, children }: LayoutProps) {
	return (
		<html lang="en">
			<head>
				<meta charset="utf-8" />
				<meta content="width=device-width, initial-scale=1" name="viewport" />
				<meta content="dark light" name="color-scheme" />
				<title>{title === siteName ? siteName : `${title} - ${siteName}`}</title>
				<link href="https://rsms.me/" rel="preconnect" />
				<link href="https://rsms.me/inter/inter.css" rel="stylesheet" />
				<style dangerouslySetInnerHTML={{ __html: styles }} />
				{plausible && (
					<script
						data-api={`${plausible.host}/api/event`}
						data-domain={plausible.domain}
						defer
						src={scriptUrl(plausible)}
					/>
				)}
			</head>
			<body>
				<main class="page">
					{children}
					<footer class="colophon">
						<a href={REPOSITORY_URL}>yuripo</a>
					</footer>
				</main>
			</body>
		</html>
	);
}
