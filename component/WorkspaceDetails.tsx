import { TFile } from "obsidian"
import { EmbeddedFileInfo, NoteLinks } from "./NoteLinks"

export type WorkspaceDetailsProps = {
	file: TFile
	links: EmbeddedFileInfo[]
	onRebuildAll: () => void
	onLinkClick: (link: EmbeddedFileInfo) => void
	onLinkRebuild: (link: EmbeddedFileInfo) => void
}
export const WorkspaceDetails = ({
	file,
	links,
	onRebuildAll,
	onLinkClick,
	onLinkRebuild,
}: WorkspaceDetailsProps) => {
	return (
		<div>
			<NoteLinks
				file={file}
				links={links}
				onLinkClick={onLinkClick}
				onLinkRebuild={onLinkRebuild}
			/>
			<button onClick={onRebuildAll}>Rebuild embedding DB</button>
		</div>
	)
}

export const NonWorkspaceView = (props: { file: TFile }) => {
	return (
		<div>
			<h4>Not a workspace yet</h4>
			<p>
				{props.file.basename} is not an LLM workspace yet. Update its frontmatter and try
				again.
			</p>
		</div>
	)
}
