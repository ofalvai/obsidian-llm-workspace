import { FileX2, FileCheck2, ChevronDown, ChevronUp, Folder } from "lucide-preact"
import { TFile, TFolder } from "obsidian"
import { useState } from "preact/hooks"

export interface EmbeddedFileInfo {
	name: string
	parent: TFolder | null
	path: string
	nodeCount: number
	lastProcessed: number | undefined
}

type NoteLinksProps = {
	file: TFile
	links: EmbeddedFileInfo[]
	onLinkClick: (path: string) => void
	onLinkRebuild: (link: EmbeddedFileInfo) => void
}
export const NoteLinks = ({ file, links, onLinkClick, onLinkRebuild }: NoteLinksProps) => {
	return (
		<div>
			<h6>Linked notes</h6>
			<ul>
				{links.map((link) => (
					<NoteLink link={link} onLinkClick={onLinkClick} onRebuild={onLinkRebuild} />
				))}
			</ul>
			{links.length === 0 && <p>No links</p>}
		</div>
	)
}

type NoteLinkProps = {
	link: EmbeddedFileInfo
	onLinkClick: (path: string) => void
	onRebuild: (link: EmbeddedFileInfo) => void
}
const NoteLink = ({ link, onLinkClick, onRebuild }: NoteLinkProps) => {
	let label = ""
	switch (link.nodeCount) {
		case 0:
			label = "Not indexed yet"
			break
		case 1:
			label = "Indexed as 1 node "
			// TODO: it should periodically re-render to update the timestamp
			label += window.moment(link.lastProcessed).fromNow()
			break
		default:
			label = `Indexed as ${link.nodeCount} nodes `
			label += window.moment(link.lastProcessed).fromNow()
	}
	const [isCollapsed, setCollapsed] = useState(true)
	return (
		<div key={link.path} class="llm-workspace-link-container">
			<div class="llm-workspace-link-header">
				<span
					class="llm-workspace-link-status-icon"
					aria-label={label}
					data-tooltip-position="top"
					data-tooltip-delay="300"
				>
					{link.nodeCount == 0 && (
						<FileX2 size={18} color="var(--background-modifier-error)" />
					)}
					{link.nodeCount > 0 && (
						<FileCheck2 size={18} color="var(--background-modifier-success)" />
					)}
				</span>
				<a class="llm-workspace-link-name" onClick={() => onLinkClick(link.path)}>{link.name}</a>
				<div
					class="clickable-icon llm-workspace-link-expand"
					onClick={() => setCollapsed(!isCollapsed)}
				>
					{isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
				</div>
			</div>

			<div
				className={"llm-workspace-link-details " + (isCollapsed ? "collapsed" : "expanded")}
			>
				{link.parent && !link.parent.isRoot() && (
					<div class="llm-workspace-link-parent">
						<Folder size={18} class="llm-workspace-link-icon-folder" />
						{link.parent.name}
					</div>
				)}
				<button onClick={() => onRebuild(link)}>Re-index file</button>
			</div>
		</div>
	)
}
