import { formatBytes, formatDate, pluralize } from "../format";
import { hrefFor, parentOf } from "../paths";
import type { Listing } from "../s3/client";
import { FileIcon, FolderIcon, ParentIcon } from "./icons";

export function ListingTable({ listing, cursor }: { listing: Listing; cursor?: string }) {
	const { prefix, folders, files, nextCursor } = listing;
	const isEmpty = folders.length === 0 && files.length === 0;

	return (
		<section class="panel">
			<table class="listing">
				<thead>
					<tr>
						<th scope="col">Name</th>
						<th class="numeric" scope="col">
							Size
						</th>
						<th class="modified" scope="col">
							Last modified
						</th>
					</tr>
				</thead>
				<tbody>
					{prefix && (
						<tr>
							<td colspan={3}>
								<a class="entry muted" href={hrefFor(parentOf(prefix))}>
									<ParentIcon />
									<span>Parent folder</span>
								</a>
							</td>
						</tr>
					)}
					{folders.map((folder) => (
						<tr>
							<td>
								<a class="entry folder" href={hrefFor(folder.prefix)}>
									<FolderIcon />
									<span>{folder.name}</span>
								</a>
							</td>
							<td class="numeric muted">—</td>
							<td class="modified muted">—</td>
						</tr>
					))}
					{files.map((file) => (
						<tr>
							<td>
								<a class="entry" href={hrefFor(file.key)}>
									<FileIcon />
									<span>{file.name}</span>
								</a>
							</td>
							<td class="numeric">{formatBytes(file.size)}</td>
							<td class="modified">
								<time datetime={file.lastModified.toISOString()}>
									{formatDate(file.lastModified)}
								</time>
							</td>
						</tr>
					))}
					{isEmpty && (
						<tr>
							<td class="empty" colspan={3}>
								This folder is empty.
							</td>
						</tr>
					)}
				</tbody>
			</table>
			<footer class="panel-footer">
				<span>
					{pluralize(folders.length, "folder")}, {pluralize(files.length, "file")}
					{cursor || nextCursor ? " on this page" : ""}
				</span>
				<span class="pager">
					{cursor && <a href={hrefFor(prefix)}>First page</a>}
					{nextCursor && (
						<a href={`${hrefFor(prefix)}?cursor=${encodeURIComponent(nextCursor)}`}>Next page</a>
					)}
				</span>
			</footer>
		</section>
	);
}
