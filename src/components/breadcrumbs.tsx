import { crumbsFor, hrefFor } from "../paths";
import { ChevronRightIcon } from "./icons";

export function Breadcrumbs({ bucket, prefix }: { bucket: string; prefix: string }) {
	const crumbs = [{ name: bucket, prefix: "" }, ...crumbsFor(prefix)];
	const current = crumbs.length - 1;

	return (
		<nav aria-label="Breadcrumb" class="breadcrumbs">
			<ol>
				{crumbs.map((crumb, index) => (
					<li>
						{index > 0 && <ChevronRightIcon />}
						{index === current ? (
							<span aria-current="page">{crumb.name}</span>
						) : (
							<a href={hrefFor(crumb.prefix)}>{crumb.name}</a>
						)}
					</li>
				))}
			</ol>
		</nav>
	);
}
