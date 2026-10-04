import type { Child } from "hono/jsx";

const STROKE = {
	stroke: "currentColor",
	"stroke-width": "var(--nucleo-stroke-width, 1.5)",
	"stroke-linecap": "round",
	"stroke-linejoin": "round",
	fill: "none",
} as const;

const DUO_FILL = {
	fill: "currentColor",
	"fill-opacity": "0.3",
	"data-color": "color-2",
	"data-stroke": "none",
} as const;

function Icon({ children }: { children: Child }) {
	return (
		<svg aria-hidden="true" class="icon" height="18" viewBox="0 0 18 18" width="18">
			{children}
		</svg>
	);
}

export const FolderIcon = () => (
	<Icon>
		<path
			{...DUO_FILL}
			d="M4.25 6.75H13.75C14.855 6.75 15.75 7.645 15.75 8.75V13.25C15.75 14.355 14.855 15.25 13.75 15.25H4.25C3.145 15.25 2.25 14.355 2.25 13.25V8.75C2.25 7.645 3.145 6.75 4.25 6.75Z"
		/>
		<path
			{...STROKE}
			d="M2.25 8.75V4.75C2.25 3.645 3.145 2.75 4.25 2.75H6.201C6.808 2.75 7.381 3.025 7.761 3.498L8.364 4.25H13.75C14.855 4.25 15.75 5.145 15.75 6.25V9.094"
		/>
		<path
			{...STROKE}
			d="M4.25 6.75H13.75C14.855 6.75 15.75 7.645 15.75 8.75V13.25C15.75 14.355 14.855 15.25 13.75 15.25H4.25C3.145 15.25 2.25 14.355 2.25 13.25V8.75C2.25 7.645 3.145 6.75 4.25 6.75Z"
		/>
	</Icon>
);

export const FileIcon = () => (
	<Icon>
		<path
			{...DUO_FILL}
			clip-rule="evenodd"
			d="M10.75 1.83956C10.6212 1.78103 10.4801 1.75 10.336 1.75H4.75C3.645 1.75 2.75 2.645 2.75 3.75V14.25C2.75 15.355 3.645 16.25 4.75 16.25H13.25C14.355 16.25 15.25 15.355 15.25 14.25V6.664C15.25 6.51978 15.2189 6.37883 15.1603 6.24999H11.75C11.198 6.24999 10.75 5.80199 10.75 5.24999V1.83956Z"
			fill-rule="evenodd"
		/>
		<path {...STROKE} d="M15.16 6.24999H11.75C11.198 6.24999 10.75 5.80199 10.75 5.24999V1.85199" />
		<path
			{...STROKE}
			d="M2.75 14.25V3.75C2.75 2.645 3.645 1.75 4.75 1.75H10.336C10.601 1.75 10.856 1.855 11.043 2.043L14.957 5.957C15.145 6.145 15.25 6.399 15.25 6.664V14.25C15.25 15.355 14.355 16.25 13.25 16.25H4.75C3.645 16.25 2.75 15.355 2.75 14.25Z"
		/>
	</Icon>
);

export const ParentIcon = () => (
	<Icon>
		<path {...STROKE} d="M8.25 2.75V13.25C8.25 14.355 9.145 15.25 10.25 15.25H14.25" />
		<path {...STROKE} d="M12.5 7L8.25 2.75L4 7" />
	</Icon>
);

export const ChevronRightIcon = () => (
	<Icon>
		<path {...STROKE} d="M6.5 2.75L12.75 9L6.5 15.25" />
	</Icon>
);
