export type TextSelectionAction = "explain" | "improve" | "debate" | "alternatives"

export const selectionActionToMessage = (action: TextSelectionAction, selectedText: string): string => {
	switch (action) {
		case "explain":
			return `Explain this text in more detail:\n\n> ${selectedText}`
		case "improve":
			return `Improve this part of the text:\n\n> ${selectedText}`
		case "debate":
			return `Take a stance on the topic and argue against it. Construct a convincing argument and provide evidence. Topic:\n\n> ${selectedText}`
		case "alternatives":
			return `Provide 10 alternatives to this:\n\n> ${selectedText}`
	}
}

export const handleTextSelection = (
	conversationContainer: HTMLElement,
	onShowActions: (
		selectedText: string, 
		position: { x: number; y: number }, 
	) => void,
	onHideActions: () => void,
) => {
	const selection = window.getSelection()
	if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
		onHideActions()
		return
	}

	const range = selection.getRangeAt(0)
	const text = selection.toString().trim()

	if (!text || !conversationContainer) {
		onHideActions()
		return
	}

	// Check if the selection is within the conversation container. The event listener
	// can only be attached to the entire window.
	const startContained = conversationContainer.contains(range.startContainer)
	const endContained = conversationContainer.contains(range.endContainer)
	const isWithinContainer = startContained && endContained
	if (!isWithinContainer) {
		onHideActions()
		return
	}

	const rect = range.getBoundingClientRect()
	const isMultiLineSelection = range.getClientRects().length > 1

	const popupWidth = 120
	const popupHeight = 40
	let x = 0
	const containerRect = conversationContainer.getBoundingClientRect()
	if (isMultiLineSelection) {
		// Align to the right side of container at all times
		x = rect.left - containerRect.left + containerRect.width - popupWidth - 10
	} else {
		// Align to the right side of the selection
		x = rect.right - containerRect.left + 20
	}
	let y = rect.bottom - popupHeight + 10

	if (x + popupWidth > containerRect.width) {
		x = rect.left - containerRect.left + containerRect.width - popupWidth - 10
	}
	if (y + popupHeight > containerRect.height) {
		y = rect.bottom - popupHeight
	}

	onShowActions(text, { x, y })
}
