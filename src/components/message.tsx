import type { Child } from "hono/jsx";

type MessageProps = {
	eyebrow: string;
	title: string;
	children?: Child;
};

export function Message({ eyebrow, title, children }: MessageProps) {
	return (
		<section class="panel message">
			<p class="eyebrow">{eyebrow}</p>
			<h1>{title}</h1>
			{children}
			<a class="button" href="/">
				Back to bucket root
			</a>
		</section>
	);
}
