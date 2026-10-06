import type { Child } from "hono/jsx";

type MessageProps = {
	title: string;
	children?: Child;
};

export function Message({ title, children }: MessageProps) {
	return (
		<section class="panel message">
			<h1>{title}</h1>
			{children}
			<a class="button" href="/">
				Back to bucket root
			</a>
		</section>
	);
}
