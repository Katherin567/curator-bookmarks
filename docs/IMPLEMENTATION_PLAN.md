# Curator Bookmark 重度用户能力实现计划

本文档是后续 feature agents 的接口契约。Architecture Agent 只做代码结构调研和设计，不实现完整 UI 或业务逻辑。

## 当前结构速览

- `src/shared/`：跨入口复用的 Chrome API wrapper、存储 helper、书签树抽取、标签索引、回收站、常量和类型。
- `src/options/options.ts`：设置页总入口，负责状态水合、导航、通用确认弹层、检测流程和跨 section 协调；文件很大，后续改动要局部化。
- `src/options/sections/`：已有模块包括 `dashboard.ts`、`duplicates.ts`、`recycle.ts`、`redirects.ts`、`ignore.ts`、`history.ts`、`content-extraction.ts`、`ai-settings.ts` 等。
- `src/popup/`：弹窗搜索、自然语言搜索、智能分类和移动/删除入口。`src/popup/search.ts` 已支持 `site:`、`folder:`、`type:` 的初版结构化过滤。
- `src/service-worker/service-worker.ts`：MV3 后台，负责快捷键、自动分析队列、真实导航检测、书签保存和 AI 自动归类。
- `src/newtab/newtab.ts`：新标签页配置、拖拽、图标、背景和本地 IndexedDB 背景媒体管理。

## 设计原则

- 保持 MV3、本地优先，不引入后端、账号系统、云同步或重型运行时依赖。
- 所有新增 UI 文案使用中文。
- 公共协议先落在 `src/shared/*`，UI 入口只做展示和调用，避免复制业务逻辑。
- 危险操作必须先预览、再确认、再调用自动备份 hook。
- AI 设置导出时必须省略 `apiKey`，不要写入脱敏占位以外的敏感内容。
- IndexedDB 只保存大对象或高频增长数据；`chrome.storage.local` 保存索引、设置和小体积摘要。

## 新增 STORAGE_KEYS

后续 agents 如需修改 `src/shared/constants.ts`，按以下命名一次性补齐；不要另起同义 key。

```ts
export const STORAGE_KEYS = {
  // ...
  backupSettings: 'curatorBookmarkBackupSettings',
  autoBackupIndex: 'curatorBookmarkAutoBackupIndex',
  folderCleanupState: 'curatorBookmarkFolderCleanupState',
  inboxState: 'curatorBookmarkInboxState',
  inboxSettings: 'curatorBookmarkInboxSettings',
  contentSnapshotSettings: 'curatorBookmarkContentSnapshotSettings',
  contentSnapshotIndex: 'curatorBookmarkContentSnapshotIndex',
  savedSearches: 'curatorBookmarkSavedSearches'
} as const
```

建议同步新增常量：

```ts
export const AUTO_BACKUP_RETENTION_LIMIT = 5
export const CONTENT_SNAPSHOT_LOCAL_TEXT_LIMIT = 20 * 1024
export const SAVED_SEARCH_LIMIT = 30
export const INBOX_AUTO_MOVE_MIN_CONFIDENCE = 0.72
```

`src/newtab/newtab.ts` 现有 `NEW_TAB_ACTIVITY_STORAGE_KEY = 'curatorBookmarkNewTabActivity'` 暂不强制迁入 `STORAGE_KEYS`，但备份 Agent 可以按原字符串读取。

## IndexedDB 使用边界

已有 IndexedDB：

- `curatorNewTabBackgroundMedia`：仅供新标签页背景图片/视频缓存使用，不要复用为其它 feature 数据库。

新增建议：

```ts
const HEAVY_USER_DB_NAME = 'curatorBookmarkHeavyUserData'
const HEAVY_USER_DB_VERSION = 1
```

Object stores：

- `autoBackups`：keyPath `backupId`，保存自动备份完整 payload。`chrome.storage.local` 只保存 `autoBackupIndex` 元数据。
- `contentFullText`：keyPath `snapshotId`，保存超过 20KB 的全文纯文本。

约束：

- `chrome.storage.local` 可保存 `summary`、`headings`、`canonicalUrl`、`finalUrl`、`contentType`、`extractedAt` 和短全文。
- 单条全文 `> 20KB` 时必须写入 `contentFullText`，`contentSnapshotIndex` 只保存 `fullTextRef`、`fullTextBytes`、`hasFullText`。
- 搜索读取 IndexedDB 时要分批、可取消；Popup 默认只搜索 storage 内索引，全文搜索仅在用户开启后参与。

## 备份 JSON schema

备份文件名：`curator-backup-YYYY-MM-DD.json`。

```ts
interface CuratorBackupFileV1 {
  app: 'curator-bookmarks'
  kind: 'full-backup'
  schemaVersion: 1
  exportedAt: string
  extensionVersion: string
  manifestVersion: 3
  source: 'manual' | 'auto'
  redaction: {
    aiProviderSettings: 'apiKey-omitted'
    omittedFields: ['apiKey']
  }
  chromeBookmarks: {
    exportedAt: string
    tree: chrome.bookmarks.BookmarkTreeNode[]
  }
  storage: {
    bookmarkTagIndex: BookmarkTagIndex
    recycleBin: unknown[]
    ignoreRules: {
      bookmarks: unknown[]
      domains: unknown[]
      folders: unknown[]
    }
    redirectCache: unknown
    newTab: {
      customIcons?: unknown
      backgroundSettings?: unknown
      searchSettings?: unknown
      iconSettings?: unknown
      timeSettings?: unknown
      generalSettings?: unknown
      folderSettings?: unknown
      activity?: unknown
    }
    popupPreferences?: unknown
    aiProviderSettings: Omit<AiNamingSettings, 'apiKey'> & {
      apiKey?: never
      apiKeyRedacted: true
    }
  }
  notes?: string[]
}
```

恢复策略：

- 导入后先生成 `BackupRestorePreview`，只展示差异，不立即写入。
- `tagsOnly`：只恢复 `bookmarkTagIndex`，按 `bookmarkId`、`normalizedUrl`、`duplicateKey` 匹配当前书签，无法匹配的记录计入 `unmatched`。
- `newTabOnly`：只恢复新标签页配置，不恢复 API Key，也不恢复新标签页背景媒体 IndexedDB blob。
- `safeFull`：恢复扩展本地数据，并把缺失的书签树复制到 `Curator Restore YYYY-MM-DD` 文件夹下，不做破坏性覆盖。
- 不支持默认“替换整个 Chrome 书签树”；如未来加入，必须单独二次确认且先自动备份。

## 危险操作自动备份 hook

建议新增文件：`src/shared/backup.ts`。所有危险操作调用同一个 hook。

```ts
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
): Promise<AutoBackupHookResult>
```

必须接入的现有 call sites：

- `src/options/sections/recycle.ts`：`deleteBookmarksToRecycle` 前。
- `src/options/options.ts`：`moveSelectedAvailabilityToFolder` 前。
- `src/options/sections/dashboard.ts`：`moveSelectedDashboardBookmarks` 和拖拽移动前。
- `src/options/sections/duplicates.ts`：`deleteSelectedDuplicates` 确认后、删除前。
- `src/options/sections/redirects.ts`：批量删除和批量更新 URL 前。
- Folder Cleanup 和 Batch Tags 新模块执行写操作前。

## Inbox 数据结构

```ts
export interface InboxSettings {
  version: 1
  enabled: boolean
  folderTitle: 'Inbox / 待整理' | string
  autoMoveToRecommendedFolder: boolean
  tagOnlyNoAutoMove: boolean
  minAutoMoveConfidence: number
  notifyOnClassified: boolean
}

export type InboxItemStatus =
  | 'captured'
  | 'analyzing'
  | 'tagged'
  | 'moved'
  | 'needs-review'
  | 'failed'
  | 'undone'

export interface InboxItem {
  captureId: string
  bookmarkId: string
  url: string
  title: string
  inboxFolderId: string
  originalParentId: string
  recommendedFolderId?: string
  recommendedFolderPath?: string
  confidence?: number
  status: InboxItemStatus
  createdAt: number
  updatedAt: number
  lastError?: string
}

export interface InboxUndoMove {
  bookmarkId: string
  fromFolderId: string
  toFolderId: string
  movedAt: number
  expiresAt: number
}

export interface InboxState {
  version: 1
  folderId: string
  items: InboxItem[]
  lastUndoMove?: InboxUndoMove
}
```

Inbox Agent 应新增 manifest command：`curator-capture-inbox`。快捷键触发后由 service worker 保存当前页到 Inbox 文件夹，再入队现有自动分析流程。低置信度或 `tagOnlyNoAutoMove` 开启时只写标签/摘要，不移动文件夹。

## Saved searches 数据结构

```ts
export interface SavedSearch {
  id: string
  name: string
  query: string
  scope: 'popup' | 'dashboard' | 'both'
  createdAt: number
  updatedAt: number
}

export interface SavedSearchIndex {
  version: 1
  updatedAt: number
  searches: SavedSearch[]
}
```

搜索语法 parser 建议新增 `src/shared/search-query.ts`，统一 Popup 与 Dashboard：

```ts
export interface ParsedSearchQuery {
  rawQuery: string
  textTerms: string[]
  siteFilters: string[]
  folderFilters: string[]
  typeFilters: string[]
  excludedTerms: string[]
  dateRange: { from: number; to: number; label: string } | null
  chips: Array<{ kind: 'site' | 'folder' | 'type' | 'time' | 'exclude'; label: string; value: string }>
}
```

## 标签批量操作 API

建议在 `src/shared/bookmark-tags.ts` 增加纯函数和 async API，保持手动标签优先展示。

```ts
export type BatchTagOperation =
  | { type: 'add-manual-tags'; bookmarkIds: string[]; tags: string[] }
  | { type: 'remove-manual-tags'; bookmarkIds: string[]; tags: string[] }
  | { type: 'rename-tag'; from: string; to: string; includeAiTags?: boolean }
  | { type: 'merge-tags'; sources: string[]; target: string; includeAiTags?: boolean }

export interface TagUsageStats {
  tag: string
  manualCount: number
  aiCount: number
  totalCount: number
}

export interface BatchTagOperationResult {
  updatedIndex: BookmarkTagIndex
  touchedBookmarkIds: string[]
  changedCount: number
  skippedCount: number
}

export function getBookmarkTagUsageStats(index: BookmarkTagIndex): TagUsageStats[]
export function getUntaggedBookmarkIds(bookmarks: BookmarkRecord[], index: BookmarkTagIndex): string[]
export async function applyBatchTagOperation(operation: BatchTagOperation): Promise<BatchTagOperationResult>
```

合并策略：

- `getEffectiveBookmarkTags()` 继续保持手动标签优先。
- 批量添加/移除默认只改 `manualTags`。
- 重命名/合并默认只改 `manualTags`；只有 `includeAiTags === true` 时才改 `tags`，且不得覆盖已有 `manualTags`。
- 批量操作前必须确认并调用 `createAutoBackupBeforeDangerousOperation({ kind: 'batch-tag-update', ... })`。

## Feature agents 写入边界

### Agent 1：完整备份/恢复

主要 write set：

- `src/shared/backup.ts`：备份 schema、脱敏、导出、恢复预览、自动备份 hook、IDB `autoBackups` helper。
- `src/shared/constants.ts`：添加 `backupSettings`、`autoBackupIndex` 和保留数量常量。
- `src/options/sections/backup-restore.ts`：设置页备份/恢复 UI 逻辑。
- `src/options/options.html`、`src/options/options.css`、`src/options/shared-options/dom.ts`、`src/options/shared-options/state.ts`、`src/options/shared-options/constants.ts`：新增设置页 section 和 DOM refs。
- `src/options/sections/recycle.ts`、`src/options/sections/duplicates.ts`、`src/options/sections/redirects.ts`、`src/options/sections/dashboard.ts`、`src/options/options.ts`：只允许在危险写操作前接入 hook。

避免改动：

- 不重写现有 `buildBookmarkTagExport` / `mergeBookmarkTagImport` 行为，只在完整备份中复用。
- 不导出 `apiKey`。

### Agent 2：文件夹清理

主要 write set：

- `src/options/sections/folder-cleanup.ts`：建议生成、预览、确认后的删除/合并/移动。
- `src/shared/folder-cleanup.ts`：纯分析函数，输入 `chrome.bookmarks.BookmarkTreeNode` 或 `ExtractedBookmarkData`，输出 suggestions。
- `src/shared/bookmarks-api.ts`：如确需删除空文件夹，新增小 wrapper，例如 `removeBookmarkTree` 或 `removeBookmarkNode`。
- `src/shared/constants.ts`：添加 `folderCleanupState`。
- `src/options/options.html`、`src/options/options.css`、`src/options/shared-options/dom.ts`、`src/options/shared-options/state.ts`、`src/options/shared-options/constants.ts`：新增 section。

避免改动：

- 不自动执行危险操作。
- 不修改 `duplicates.ts` 的重复书签逻辑。

### Agent 5A：高级搜索产品化

主要 write set：

- `src/shared/search-query.ts`：统一 parser、chips 和 saved search normalizer。
- `src/shared/constants.ts`：添加 `savedSearches`。
- `src/popup/search.ts`、`src/popup/popup.ts`、`src/popup/dom.ts`、`src/popup/state.ts`、`src/popup/popup.html`、`src/popup/popup.css`：placeholder、帮助弹层、chips、saved search。
- `src/options/sections/dashboard.ts`、`src/options/options.html`、`src/options/options.css`、`src/options/shared-options/dom.ts`、`src/options/shared-options/state.ts`：Dashboard 搜索帮助、chips、saved search。

避免改动：

- 不引入搜索依赖。
- 不破坏现有自然语言搜索开关；AI 解析仍然是可选增强。

### Agent 3：Inbox Capture

主要 write set：

- `src/shared/inbox.ts`：Inbox settings/state normalizer、folder helper、undo state helper。
- `src/shared/messages.ts`：新增 Inbox runtime message 类型。
- `src/shared/constants.ts`：添加 `inboxState`、`inboxSettings`。
- `src/manifest.json`：新增 `curator-capture-inbox` command。
- `src/service-worker/service-worker.ts`：处理快捷键、创建 Inbox 书签、队列参数、低置信度保留、通知、撤销。
- `src/popup/popup.ts`、`src/popup/popup.html`、`src/popup/popup.css`：固定入口 `Inbox / 待整理` 和撤销入口。
- `src/options/options.html`、`src/options/options.css`、`src/options/shared-options/dom.ts`、`src/options/shared-options/state.ts`：通用设置开关。

依赖：

- 依赖 Agent 1 的 `createAutoBackupBeforeDangerousOperation`，但 Inbox 创建本身不是危险操作；撤销移动可不备份，批量清理 Inbox 时要备份。

### Agent 4：全文索引/网页快照

主要 write set：

- `src/shared/content-snapshots.ts`：snapshot schema、storage/indexedDB helper、20KB 边界。
- `src/shared/constants.ts`：添加 `contentSnapshotSettings`、`contentSnapshotIndex` 和 20KB 常量。
- `src/options/sections/content-extraction.ts`：只做小型导出或适配，复用现有 `PageContentContext`。
- `src/service-worker/service-worker.ts`：自动分析/Inbox 捕获后保存快照；支持“仅本地保存，不上传 AI”模式。
- `src/popup/search.ts`、`src/popup/popup.ts`、`src/options/sections/dashboard.ts`：搜索纳入 summary/headings；全文开启后纳入全文。
- `src/options/options.html`、`src/options/options.css`、`src/options/shared-options/dom.ts`、`src/options/shared-options/state.ts`：设置开关和状态。

避免改动：

- 不把超过 20KB 的全文写入 `chrome.storage.local`。
- 不默认上传全文给 AI。

### Agent 5B：批量标签管理

主要 write set：

- `src/shared/bookmark-tags.ts`：新增批量标签 API 和统计函数。
- `src/options/sections/batch-tags.ts`：批量添加、移除、重命名、合并、统计、未打标签筛选。
- `src/options/sections/dashboard.ts`：只接入入口或复用 selection，不重写 dashboard 卡片。
- `src/options/options.html`、`src/options/options.css`、`src/options/shared-options/dom.ts`、`src/options/shared-options/state.ts`、`src/options/shared-options/constants.ts`：新增 section 或 Dashboard 内面板。

依赖：

- 依赖 Agent 1 的自动备份 hook。
- 遵循本文的手动标签优先策略。

## 容易冲突的文件

高冲突：

- `src/options/options.ts`
- `src/options/options.html`
- `src/options/options.css`
- `src/options/shared-options/dom.ts`
- `src/options/shared-options/state.ts`
- `src/options/shared-options/constants.ts`
- `src/shared/constants.ts`
- `src/shared/types.ts`
- `src/service-worker/service-worker.ts`

中冲突：

- `src/shared/bookmark-tags.ts`
- `src/popup/popup.ts`
- `src/popup/popup.html`
- `src/popup/popup.css`
- `src/popup/dom.ts`
- `src/popup/state.ts`
- `src/popup/search.ts`
- `src/options/sections/dashboard.ts`

低冲突：

- 新增模块：`backup.ts`、`folder-cleanup.ts`、`inbox.ts`、`content-snapshots.ts`、`search-query.ts`、`batch-tags.ts`。

## Merge 顺序建议

第一轮：

1. Architecture：本文档。

第二轮并行完成后，按以下顺序合并：

1. Backup/Restore：先落地 `STORAGE_KEYS`、备份 schema、自动备份 hook。
2. Folder Cleanup：接入 Backup hook，处理 folder cleanup UI 和执行逻辑。
3. Search UX：最后合并搜索 UI，减少与 options shell 的冲突。

第三轮并行完成后，按以下顺序合并：

1. Inbox Capture：依赖 Backup hook，改 service worker 和 manifest。
2. Content Snapshot：复用 Inbox/自动分析的内容抽取路径，改搜索索引。
3. Batch Tags：依赖 Backup hook 和稳定后的 Dashboard/Search selection。

每个 feature agent 完成后必须运行：

```sh
npm run typecheck
npm test
npm run build
```

并提交独立 commit。
