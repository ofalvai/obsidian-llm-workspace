import { App, FuzzySuggestModal, TFile, TFolder, Vault } from "obsidian"

export async function showSelectVaultFileModal(app: App, onSelect: (file: TFile) => void, root?: TFolder) {
	let files: TFile[] = []
	if (root) {
		Vault.recurseChildren(root, (entry) => {
			if (entry instanceof TFile) {
				files.push(entry)
			}
		})
	} else {
		files = app.vault.getMarkdownFiles()
	}

	const modal = new SelectVaultFileModal(app, files, onSelect)
	const locationLabel = root ? root.path : "vault"
	modal.setPlaceholder(`Select a file from ${locationLabel}`)
	modal.open()
}

export class SelectVaultFileModal extends FuzzySuggestModal<TFile> {
	private files: TFile[]
	private onSelect: (file: TFile) => void

	constructor(app: App, files: TFile[], onSelect: (file: TFile) => void) {
		super(app)
		this.files = files
		this.onSelect = onSelect
	}

	getItems(): TFile[] {
		return this.files
	}

	getItemText(file: TFile): string {
		return file.basename
	}

	onChooseItem(file: TFile, evt: MouseEvent | KeyboardEvent) {
		this.onSelect(file)
	}
}
