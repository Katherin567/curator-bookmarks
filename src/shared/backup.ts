export type DangerousOperationKind =
  | 'batch-delete'
  | 'batch-move'
  | 'duplicate-cleanup'
  | 'availability-cleanup'
  | 'folder-cleanup-delete'
  | 'folder-cleanup-merge'
  | 'folder-cleanup-move'
  | 'redirect-url-update'
  | 'batch-tag-update'
  | 'restore'

export interface AutoBackupBeforeDangerousOperationOptions {
  kind: DangerousOperationKind
  source: 'options' | 'popup' | 'newtab' | 'service-worker'
  reason: string
  targetBookmarkIds?: string[]
  targetFolderIds?: string[]
  estimatedChangeCount?: number
  retentionLimit?: number
  now?: number
}

export interface AutoBackupHookResult {
  backupId: string
  fileName: string
  createdAt: number
  skipped: boolean
  reason?: string
  sizeBytes?: number
}

export async function createAutoBackupBeforeDangerousOperation(
  options: AutoBackupBeforeDangerousOperationOptions
): Promise<AutoBackupHookResult> {
  const createdAt = options.now ?? Date.now()

  return {
    backupId: `pending-${createdAt}`,
    fileName: '',
    createdAt,
    skipped: true,
    reason: '自动备份实现尚未安装'
  }
}
