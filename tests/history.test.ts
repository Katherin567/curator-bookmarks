import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { AvailabilityResult, BookmarkRecord } from '../src/shared/types.js'

import {
  getHistoricalAbnormalStreak,
  getHistoryRunsForScope,
  hydrateDetectionHistory
} from '../src/options/sections/history.js'
import {
  buildPendingAvailabilitySnapshot,
  normalizePendingAvailabilitySnapshot,
  reconcilePendingAvailabilitySnapshot
} from '../src/options/sections/pending-availability.js'
import { managerState } from '../src/options/shared-options/state.js'

const callbacks = {
  getCurrentAvailabilityScopeMeta() {
    return {
      key: 'all',
      type: 'all',
      folderId: '',
      label: '全部书签'
    }
  },
  renderAvailabilitySection() {}
}

function bookmark(overrides: Partial<BookmarkRecord> = {}): BookmarkRecord {
  const title = overrides.title || 'Example'
  const url = overrides.url || 'https://example.com/docs'

  return {
    id: overrides.id || 'bookmark-1',
    title,
    url,
    displayUrl: overrides.displayUrl || 'example.com/docs',
    normalizedTitle: overrides.normalizedTitle || title.toLowerCase(),
    normalizedUrl: overrides.normalizedUrl || 'example.com/docs',
    duplicateKey: overrides.duplicateKey || 'example.com/docs',
    domain: overrides.domain || 'example.com',
    path: overrides.path || 'Bookmarks Bar / Docs',
    ancestorIds: overrides.ancestorIds || ['1', '10'],
    parentId: overrides.parentId || '10',
    index: overrides.index ?? 0,
    dateAdded: overrides.dateAdded ?? 1
  }
}

function availabilityResult(
  overrides: Partial<AvailabilityResult> = {}
): AvailabilityResult {
  return {
    ...bookmark(overrides),
    status: overrides.status || 'review',
    badgeText: overrides.badgeText || '低置信异常',
    finalUrl: overrides.finalUrl || overrides.url || 'https://example.com/docs',
    detail: overrides.detail || '后台导航失败。',
    historyStatus: overrides.historyStatus || 'new',
    abnormalStreak: overrides.abnormalStreak ?? 1
  }
}

const allScope = {
  key: 'all',
  type: 'all',
  folderId: '',
  label: '全部书签'
}

test('hydrates detection history for the active scope', () => {
  hydrateDetectionHistory(
    {
      runs: [
        {
          runId: 'run-2',
          completedAt: 200,
          scope: { key: 'all', type: 'all', label: '全部书签' },
          results: [
            { id: 'a', title: 'A', url: 'https://a.example', status: 'failed', streak: 2 }
          ],
          newResults: [],
          recoveredResults: [
            { id: 'b', title: 'B', url: 'https://b.example', status: 'review', streak: 1 }
          ],
          summary: {
            totalAbnormal: 1,
            newCount: 0,
            persistentCount: 1,
            recoveredCount: 1,
            reviewCount: 0,
            failedCount: 1
          }
        },
        {
          runId: 'run-1',
          completedAt: 100,
          scope: { key: 'all', type: 'all', label: '全部书签' },
          results: [
            { id: 'a', title: 'A', url: 'https://a.example', status: 'review', streak: 1 }
          ],
          newResults: [
            { id: 'a', title: 'A', url: 'https://a.example', status: 'review', streak: 1 }
          ],
          recoveredResults: [],
          summary: {
            totalAbnormal: 1,
            newCount: 1,
            persistentCount: 0,
            recoveredCount: 0,
            reviewCount: 1,
            failedCount: 0
          }
        }
      ]
    },
    callbacks
  )

  assert.equal(managerState.historyLastRunAt, 200)
  assert.equal(managerState.historyRecoveredResults.length, 1)
  assert.equal(managerState.previousHistoryMap.get('a').status, 'failed')
  assert.equal(getHistoryRunsForScope(callbacks).length, 2)
  assert.equal(getHistoricalAbnormalStreak('a', callbacks), 2)
})

test('normalizes and reconciles pending availability results by current bookmark id', () => {
  const result = availabilityResult({ id: 'bookmark-1', status: 'failed', badgeText: 'HTTP 404' })
  const snapshot = normalizePendingAvailabilitySnapshot(
    buildPendingAvailabilitySnapshot({
      failedResults: [result],
      scope: allScope,
      savedAt: 100,
      completedAt: 90,
      runOutcome: 'completed',
      summary: {
        checkedBookmarks: 3,
        availableCount: 2
      }
    })
  )
  const restored = reconcilePendingAvailabilitySnapshot(
    snapshot,
    new Map([[result.id, bookmark({ id: result.id })]]),
    allScope
  )

  assert.equal(restored?.failedResults.length, 1)
  assert.equal(restored?.failedResults[0].status, 'failed')
  assert.equal(restored?.failedResults[0].badgeText, 'HTTP 404')
  assert.equal(snapshot?.summary.checkedBookmarks, 3)
})

test('reconciles pending results with stable identity when Chrome bookmark id changed', () => {
  const previous = availabilityResult({ id: 'old-id', title: 'Example Docs' })
  const current = bookmark({ id: 'new-id', title: 'Example Docs' })
  const snapshot = buildPendingAvailabilitySnapshot({
    reviewResults: [previous],
    scope: allScope,
    savedAt: 100
  })

  const restored = reconcilePendingAvailabilitySnapshot(
    snapshot,
    new Map([[current.id, current]]),
    allScope
  )

  assert.equal(restored?.reviewResults.length, 1)
  assert.equal(restored?.reviewResults[0].id, 'new-id')
  assert.equal(restored?.currentHistoryEntries[0].id, 'new-id')
  assert.equal(restored?.droppedCount, 0)
})

test('drops stale redirected snapshots when the current bookmark already uses final URL', () => {
  const redirected = availabilityResult({
    id: 'redirect',
    status: 'redirected',
    url: 'https://example.com/old',
    finalUrl: 'https://example.com/new',
    badgeText: '已跳转'
  })
  const snapshot = buildPendingAvailabilitySnapshot({
    redirectResults: [redirected],
    scope: allScope,
    savedAt: 100
  })
  const current = bookmark({
    id: 'redirect',
    url: 'https://example.com/new',
    normalizedUrl: 'example.com/new',
    duplicateKey: 'example.com/new'
  })

  const restored = reconcilePendingAvailabilitySnapshot(
    snapshot,
    new Map([[current.id, current]]),
    allScope
  )

  assert.equal(restored?.redirectResults.length, 0)
  assert.equal(restored?.droppedCount, 1)
})
