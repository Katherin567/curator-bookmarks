import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { BookmarkRecord } from '../src/shared/types.js'

import {
  buildBookmarkBackupPackage,
  createBookmarkIdentity
} from '../src/shared/bookmark-identity.js'
import {
  buildDuplicateKey,
  displayUrl,
  extractDomain,
  normalizeText,
  normalizeUrl,
  stripCommonUrlPrefix
} from '../src/shared/text.js'

function bookmark(overrides: Partial<BookmarkRecord> = {}): BookmarkRecord {
  const title = overrides.title || 'Example Docs'
  const url = overrides.url || 'https://www.example.com/docs/?b=2&a=1#intro'

  return {
    id: overrides.id || 'chrome-id-1',
    title,
    url,
    displayUrl: overrides.displayUrl || 'example.com/docs/?b=2&a=1#intro',
    normalizedTitle: overrides.normalizedTitle || title.toLowerCase(),
    normalizedUrl: overrides.normalizedUrl || 'example.com/docs/?b=2&a=1#intro',
    duplicateKey: overrides.duplicateKey || 'example.com/docs/?b=2&a=1',
    domain: overrides.domain || 'example.com',
    path: overrides.path || 'Bookmarks Bar / Docs',
    ancestorIds: overrides.ancestorIds || ['1', '10'],
    parentId: overrides.parentId || '10',
    index: overrides.index ?? 0,
    dateAdded: overrides.dateAdded ?? 1
  }
}

test('normalizes plain text by lowercasing and collapsing whitespace', () => {
  assert.equal(normalizeText('  Foo   BAR \n Baz  '), 'foo bar baz')
})

test('strips common URL prefixes for search-friendly matching', () => {
  assert.equal(stripCommonUrlPrefix(' https://www.Example.com/path '), 'Example.com/path ')
  assert.equal(normalizeUrl('HTTPS://www.Example.com/Docs '), 'example.com/docs')
})

test('formats display URLs without common prefixes or trailing slash', () => {
  assert.equal(displayUrl('https://www.example.com/docs/'), 'example.com/docs')
})

test('extracts canonical domains from valid URLs', () => {
  assert.equal(extractDomain('https://www.Example.com/docs?q=1'), 'example.com')
  assert.equal(extractDomain('not a url'), '')
})

test('builds duplicate keys from host, pathname and query', () => {
  assert.equal(
    buildDuplicateKey('https://www.Example.com/docs///?b=2&a=1#section'),
    'example.com/docs?b=2&a=1'
  )
  assert.equal(
    buildDuplicateKey('not a url/#fragment/'),
    'not a url'
  )
})

test('builds stable bookmark identity without depending on Chrome bookmark id', () => {
  const first = createBookmarkIdentity(bookmark({ id: 'chrome-id-1' }))
  const second = createBookmarkIdentity(bookmark({ id: 'chrome-id-2' }))

  assert.equal(first.identity, second.identity)
  assert.equal(first.fingerprint, second.fingerprint)
  assert.ok(first.sourceBookmarkId !== second.sourceBookmarkId)
})

test('keeps identity stable for title edits while fingerprint changes', () => {
  const before = createBookmarkIdentity(bookmark({ title: 'Example Docs' }))
  const after = createBookmarkIdentity(bookmark({ title: 'Example Documentation' }))

  assert.equal(before.identity, after.identity)
  assert.ok(before.fingerprint !== after.fingerprint)
})

test('includes folder path in identity so same URL can map to separate placements', () => {
  const docs = createBookmarkIdentity(bookmark({ path: 'Bookmarks Bar / Docs' }))
  const work = createBookmarkIdentity(bookmark({ path: 'Bookmarks Bar / Work' }))

  assert.ok(docs.identity !== work.identity)
})

test('builds a backup package with identity records for every bookmark', () => {
  const payload = buildBookmarkBackupPackage([
    bookmark({ id: 'a', title: 'A' }),
    bookmark({ id: 'b', title: 'B', url: 'https://b.example' })
  ], 100)

  assert.equal(payload.schemaVersion, 1)
  assert.equal(payload.exportedAt, 100)
  assert.equal(payload.bookmarks.length, 2)
  assert.ok(payload.bookmarks.every((entry) => entry.identity.identity.startsWith('bookmark:v1:')))
})
