import assert from 'node:assert/strict'
import { test } from 'node:test'

import { normalizeRecycleBin } from '../src/options/sections/recycle.js'

test('normalizes recycle bin entries and filters invalid records', () => {
  const entries = normalizeRecycleBin([
    {
      recycleId: 'old',
      bookmarkId: 1,
      title: '',
      url: 'https://old.example.com',
      parentId: 10,
      index: '2',
      path: 'Root',
      source: '',
      deletedAt: 100
    },
    {
      recycleId: 'new',
      bookmarkId: 2,
      title: 'New',
      url: 'https://new.example.com',
      deletedAt: 200
    },
    {
      recycleId: 'missing-url',
      url: ''
    }
  ])

  assert.equal(entries.length, 2)
  assert.equal(entries[0].recycleId, 'new')
  assert.equal(entries[1].recycleId, 'old')
  assert.equal(entries[1].title, '未命名书签')
  assert.equal(entries[1].parentId, '10')
  assert.equal(entries[1].index, 2)
  assert.equal(entries[1].source, '删除')
})
