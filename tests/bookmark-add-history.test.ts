import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  hydrateBookmarkAddHistory,
  normalizeBookmarkAddHistory,
  serializeBookmarkAddHistory
} from '../src/options/sections/bookmark-add-history.js'
import { managerState } from '../src/options/shared-options/state.js'

test('normalizes bookmark add history entries and sorts latest first', () => {
  const entries = normalizeBookmarkAddHistory({
    entries: [
      {
        bookmarkId: 'old',
        createdAt: 100,
        title: 'Old',
        url: 'https://old.example',
        recommendationKind: 'new',
        moved: true,
        confidence: 2
      },
      {
        bookmarkId: 'latest',
        createdAt: 200,
        title: '',
        url: 'https://latest.example',
        recommendationKind: 'existing',
        moved: false,
        confidence: -1
      },
      {
        bookmarkId: '',
        createdAt: 300,
        url: 'https://invalid.example'
      }
    ]
  })

  assert.equal(entries.length, 2)
  assert.equal(entries[0].bookmarkId, 'latest')
  assert.equal(entries[0].title, '未命名书签')
  assert.equal(entries[0].confidence, 0)
  assert.equal(entries[1].recommendationKind, 'new')
  assert.equal(entries[1].confidence, 1)
})

test('hydrates and serializes bookmark add history', () => {
  hydrateBookmarkAddHistory([
    {
      bookmarkId: 'a',
      createdAt: 100,
      title: 'A',
      url: 'https://a.example',
      targetFolderPath: '书签栏 / AI',
      recommendationKind: 'existing',
      moved: true,
      confidence: 0.8
    }
  ])

  assert.equal(managerState.bookmarkAddHistory.length, 1)
  const serialized = serializeBookmarkAddHistory()
  assert.equal(serialized.version, 1)
  assert.equal(serialized.entries[0].targetFolderPath, '书签栏 / AI')
})
