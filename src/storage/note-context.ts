import type { LlmDexie, NoteDerivedData } from "./db"

export async function getNoteDerivedData(
	db: LlmDexie,
	path: string,
): Promise<NoteDerivedData | undefined> {
	return db.noteDerivedData.get(path)
}

export async function deleteNoteDerivedData(db: LlmDexie, path: string): Promise<void> {
	return db.noteDerivedData.delete(path)
}

export async function updateNoteSummary(
	db: LlmDexie,
	path: string,
	summary: string,
): Promise<void> {
	db.transaction("rw", db.noteDerivedData, async () => {
		const dataInDB = await getNoteDerivedData(db, path)
		if (dataInDB) {
			await db.noteDerivedData.update(path, {
				summary: summary,
			})
		} else {
			await db.noteDerivedData.add({
				path: path,
				summary: summary,
			})
		}
	})
}

export async function updateNoteKeyTopics(
	db: LlmDexie,
	path: string,
	topics: string[],
): Promise<void> {
	db.transaction("rw", db.noteDerivedData, async () => {
		const dataInDB = await getNoteDerivedData(db, path)
		if (dataInDB) {
			await db.noteDerivedData.update(path, {
				keyTopics: topics,
			})
		} else {
			await db.noteDerivedData.add({
				path: path,
				keyTopics: topics,
			})
		}
	})
}
