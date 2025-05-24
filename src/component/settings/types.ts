import type { Feature } from "src/config/settings"

export interface DialogProps {
    currentModel: string | null
	feature: Feature | null
	closeDialog: () => void
}
