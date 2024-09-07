import { App, FuzzySuggestModal, TFile } from "obsidian"

export async function showSelectVaultFileModal(app: App, onSelect: (file: TFile) => void) {
	const files = app.vault.getMarkdownFiles()

	const modal = new SelectVaultFileModal(app, files, onSelect)
	modal.setPlaceholder("Select a file from vault")
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
