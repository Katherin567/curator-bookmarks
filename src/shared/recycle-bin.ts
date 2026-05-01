import { RECYCLE_BIN_LIMIT, STORAGE_KEYS } from './constants.js'
import { getLocalStorage, setLocalStorage } from './storage.js'

interface RecycleEntry {
  recycleId: string
  deletedAt: number
  title?: string
  url?: string
  parentId?: string
  index?: number
  path?: string
  [key: string]: unknown
}

let recycleBinWriteQueue: Promise<unknown> = Promise.resolve()

export async function appendRecycleEntry(entry: RecycleEntry): Promise<void> {
  return updateRecycleBinEntries((currentEntries) => {
    const recycleId = String(entry?.recycleId || '').trim()
    const dedupedEntries = recycleId
      ? currentEntries.filter((currentEntry) => String(currentEntry?.recycleId || '') !== recycleId)
      : currentEntries

    return [entry, ...dedupedEntries]
      .sort((left, right) => (Number(right.deletedAt) || 0) - (Number(left.deletedAt) || 0))
      .slice(0, RECYCLE_BIN_LIMIT)
  })
}

export async function removeRecycleEntry(recycleId: string): Promise<void> {
  return updateRecycleBinEntries((currentEntries) => {
    return currentEntries.filter((entry) => {
      return String(entry?.recycleId || '') !== String(recycleId || '')
    })
  })
}

function updateRecycleBinEntries(
  updater: (entries: RecycleEntry[]) => RecycleEntry[]
): Promise<void> {
  const task = recycleBinWriteQueue.then(async () => {
    const stored = await getLocalStorage<Record<string, unknown>>([STORAGE_KEYS.recycleBin])
    const currentEntries = Array.isArray(stored[STORAGE_KEYS.recycleBin])
      ? (stored[STORAGE_KEYS.recycleBin] as RecycleEntry[])
      : []
    const nextEntries = updater(currentEntries)
      .sort((left, right) => (Number(right.deletedAt) || 0) - (Number(left.deletedAt) || 0))
      .slice(0, RECYCLE_BIN_LIMIT)

    await setLocalStorage({
      [STORAGE_KEYS.recycleBin]: nextEntries
    })
  })

  recycleBinWriteQueue = task.catch(() => {})
  return task
}
