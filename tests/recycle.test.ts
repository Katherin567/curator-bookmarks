import assert from 'node:assert/strict'
import { test } from 'node:test'

import { appendRecycleEntry, removeRecycleEntry } from '../src/shared/recycle-bin.js'
import { normalizeRecycleBin } from '../src/options/sections/recycle.js'
import { STORAGE_KEYS } from '../src/shared/constants.js'

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

test('serializes recycle bin append and remove operations in one context', async () => {
  const store: Record<string, unknown> = {}
  const writes: unknown[] = []

  ;(globalThis as any).chrome = {
    storage: {
      local: {
        get(keys: string[], callback: (items: Record<string, unknown>) => void) {
          const snapshot: Record<string, unknown> = {}
          for (const key of keys) {
            snapshot[key] = store[key]
          }
          setTimeout(() => callback(snapshot), 0)
        },
        set(payload: Record<string, unknown>, callback: () => void) {
          setTimeout(() => {
            Object.assign(store, payload)
            writes.push(payload[STORAGE_KEYS.recycleBin])
            callback()
          }, 0)
        }
      }
    },
    runtime: {}
  }

  await Promise.all([
    appendRecycleEntry({
      recycleId: 'first',
      deletedAt: 100,
      title: 'First',
      url: 'https://first.example.com'
    }),
    appendRecycleEntry({
      recycleId: 'second',
      deletedAt: 200,
      title: 'Second',
      url: 'https://second.example.com'
    })
  ])

  assert.deepEqual(
    (store[STORAGE_KEYS.recycleBin] as Array<{ recycleId: string }>).map((entry) => entry.recycleId),
    ['second', 'first']
  )

  await Promise.all([
    removeRecycleEntry('first'),
    appendRecycleEntry({
      recycleId: 'third',
      deletedAt: 300,
      title: 'Third',
      url: 'https://third.example.com'
    })
  ])

  assert.deepEqual(
    (store[STORAGE_KEYS.recycleBin] as Array<{ recycleId: string }>).map((entry) => entry.recycleId),
    ['third', 'second']
  )
  assert.ok(writes.length >= 4)
})
