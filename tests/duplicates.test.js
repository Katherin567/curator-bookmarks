import assert from 'node:assert/strict'
import test from 'node:test'

import { buildDuplicateGroups } from '../src/options/sections/duplicates.js'
import { availabilityState } from '../src/options/shared-options/state.js'

function bookmark(id, url, parentId, ancestorIds = []) {
  return {
    id,
    title: `书签 ${id}`,
    url,
    duplicateKey: 'example.com/same',
    parentId,
    ancestorIds,
    path: parentId === '20' ? '书签栏 / 标签页' : '书签栏 / 资料',
    dateAdded: Number(id) || 1
  }
}

test('duplicate detection excludes bookmarks under configured folders', () => {
  availabilityState.folderMap = new Map([
    ['10', { title: '资料', path: '书签栏 / 资料' }],
    ['20', { title: '标签页', path: '书签栏 / 标签页' }]
  ])

  const groups = buildDuplicateGroups([
    bookmark('1', 'https://example.com/same', '10', ['1', '10']),
    bookmark('2', 'https://example.com/same', '20', ['1', '20'])
  ], {
    excludedFolderIds: ['20']
  })

  assert.equal(groups.length, 0)
})

test('duplicate detection keeps normal duplicates while dropping excluded copies', () => {
  availabilityState.folderMap = new Map([
    ['10', { title: '资料', path: '书签栏 / 资料' }],
    ['11', { title: '稍后读', path: '书签栏 / 稍后读' }],
    ['20', { title: '标签页', path: '书签栏 / 标签页' }]
  ])

  const groups = buildDuplicateGroups([
    bookmark('1', 'https://example.com/same', '10', ['1', '10']),
    bookmark('2', 'https://example.com/same', '11', ['1', '11']),
    bookmark('3', 'https://example.com/same', '20', ['1', '20'])
  ], {
    excludedFolderIds: ['20']
  })

  assert.equal(groups.length, 1)
  assert.deepEqual(groups[0].items.map((item) => String(item.id)).sort(), ['1', '2'])
})

test('duplicate detection excludes direct children by parent id', () => {
  const groups = buildDuplicateGroups([
    bookmark('1', 'https://example.com/same', '10'),
    bookmark('2', 'https://example.com/same', '20')
  ], {
    excludedFolderIds: ['20']
  })

  assert.equal(groups.length, 0)
})
