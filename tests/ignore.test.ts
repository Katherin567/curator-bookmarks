import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  matchesIgnoreRules,
  normalizeIgnoreRules,
  serializeIgnoreRules
} from '../src/options/sections/ignore.js'
import { managerState } from '../src/options/shared-options/state.js'

test('normalizes and serializes ignore rules', () => {
  const rules = normalizeIgnoreRules({
    bookmarks: [{ bookmarkId: 123, title: '', url: 'https://example.com', createdAt: 1 }],
    domains: [{ domain: 'Example.COM', createdAt: 2 }],
    folders: [{ folderId: 10, title: '', path: 'Root / Folder', createdAt: 3 }]
  })

  assert.deepEqual(serializeIgnoreRules(rules), {
    bookmarks: [{ bookmarkId: '123', title: '未命名书签', url: 'https://example.com', createdAt: 1 }],
    domains: [{ domain: 'example.com', createdAt: 2 }],
    folders: [{ folderId: '10', title: '未命名文件夹', path: 'Root / Folder', createdAt: 3 }]
  })
})

test('matches ignore rules by bookmark, domain or ancestor folder', () => {
  managerState.ignoreRules = normalizeIgnoreRules({
    bookmarks: [{ bookmarkId: 'bookmark-1', title: 'One', url: '', createdAt: 1 }],
    domains: [{ domain: 'example.com', createdAt: 2 }],
    folders: [{ folderId: 'folder-1', title: 'Folder', path: '', createdAt: 3 }]
  })

  assert.equal(matchesIgnoreRules({ id: 'bookmark-1' }), true)
  assert.equal(matchesIgnoreRules({ id: 'bookmark-2', domain: 'example.com' }), true)
  assert.equal(matchesIgnoreRules({ id: 'bookmark-3', ancestorIds: ['folder-1'] }), true)
  assert.equal(matchesIgnoreRules({ id: 'bookmark-4', domain: 'other.example', ancestorIds: [] }), false)
})
