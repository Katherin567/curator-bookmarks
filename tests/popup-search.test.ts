import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { BookmarkRecord } from '../src/shared/types.js'
import {
  indexBookmarkForSearch,
  normalizeQuery,
  scoreBookmark,
  searchBookmarks,
  searchBookmarksCooperatively
} from '../src/popup/search.js'

function bookmark(overrides: Partial<BookmarkRecord>): BookmarkRecord {
  const title = overrides.title || 'Example'
  const url = overrides.url || 'https://example.com'
  return {
    id: overrides.id || title,
    title,
    url,
    displayUrl: overrides.displayUrl || url,
    normalizedTitle: overrides.normalizedTitle || title.toLowerCase(),
    normalizedUrl: overrides.normalizedUrl || url.replace(/^https?:\/\//, '').toLowerCase(),
    duplicateKey: overrides.duplicateKey || url,
    domain: overrides.domain || 'example.com',
    path: overrides.path || 'Bookmarks Bar',
    ancestorIds: overrides.ancestorIds || ['1'],
    parentId: overrides.parentId || '1',
    index: overrides.index || 0,
    dateAdded: overrides.dateAdded || 0
  }
}

test('normalizes popup search queries for URL-like input', () => {
  assert.equal(normalizeQuery('  https://www.Example.com/docs  '), 'example.com/docs')
})

test('indexes bookmarks with path and domain search text', () => {
  const indexed = indexBookmarkForSearch(bookmark({
    title: 'OpenAI Docs',
    normalizedTitle: 'openai docs',
    normalizedUrl: 'platform.openai.com/docs',
    domain: 'platform.openai.com',
    path: 'AI / Docs'
  }))

  assert.equal(indexed.normalizedPath, 'ai / docs')
  assert.ok(indexed.searchText.includes('platform.openai.com'))
  assert.ok(indexed.searchText.includes('ai / docs'))
})

test('ranks exact and prefix title matches before weaker URL matches', () => {
  const exact = indexBookmarkForSearch(bookmark({
    id: 'exact',
    title: 'OpenAI',
    normalizedTitle: 'openai',
    normalizedUrl: 'example.com/openai'
  }))
  const urlOnly = indexBookmarkForSearch(bookmark({
    id: 'url',
    title: 'Reference',
    normalizedTitle: 'reference',
    normalizedUrl: 'openai.com/reference'
  }))

  const results = searchBookmarks('openai', [urlOnly, exact])
  assert.equal(results[0].id, 'exact')
  assert.ok(scoreBookmark(exact, 'openai', ['openai']) > scoreBookmark(urlOnly, 'openai', ['openai']))
})

test('searches Chinese bookmarks through local pinyin initials', () => {
  const indexed = indexBookmarkForSearch(bookmark({
    id: 'baidu',
    title: '百度',
    normalizedTitle: '百度',
    normalizedUrl: 'baidu.com',
    domain: 'baidu.com',
    path: '工具 / 搜索'
  }))

  const results = searchBookmarks('bd', [indexed])
  assert.equal(results[0]?.id, 'baidu')
  assert.ok(results[0]?.matchReasons.some((reason) => reason.includes('首字母 bd')))
})

test('searches AI tags and aliases for semantic local matches', () => {
  const indexed = indexBookmarkForSearch(bookmark({
    id: 'table',
    title: 'TanStack Table',
    normalizedTitle: 'tanstack table',
    normalizedUrl: 'tanstack.com/table',
    domain: 'tanstack.com',
    path: 'Frontend / React'
  }), {
    schemaVersion: 1,
    bookmarkId: 'table',
    url: 'https://tanstack.com/table',
    normalizedUrl: 'https://tanstack.com/table',
    duplicateKey: 'https://tanstack.com/table',
    title: 'TanStack Table',
    path: 'Frontend / React',
    summary: 'Headless UI library for building tables and data grids in React.',
    contentType: '工具',
    topics: ['React'],
    tags: ['table', 'grid', '表格库'],
    aliases: ['React 表格库', 'TanStack Table'],
    confidence: 0.92,
    source: 'ai_naming',
    model: 'gpt-test',
    extraction: { status: 'ok', source: 'html', warnings: [] },
    generatedAt: 1,
    updatedAt: 1
  })

  const results = searchBookmarks('React 表格库', [indexed])
  assert.equal(results[0]?.id, 'table')
  assert.ok(results[0]?.matchReasons.some((reason) => reason.includes('标签') || reason.includes('别名')))
})

test('searches AI summaries for longer semantic queries but ignores noisy single characters', () => {
  const indexed = indexBookmarkForSearch(bookmark({
    id: 'agent-memory',
    title: 'Paper Notes',
    normalizedTitle: 'paper notes',
    normalizedUrl: 'notes.example.org/memory',
    domain: 'notes.example.org',
    path: 'AI / Papers'
  }), {
    schemaVersion: 1,
    bookmarkId: 'agent-memory',
    url: 'https://notes.example.org/memory',
    normalizedUrl: 'https://notes.example.org/memory',
    duplicateKey: 'https://notes.example.org/memory',
    title: 'Paper Notes',
    path: 'AI / Papers',
    summary: 'Survey about LLM agent memory, retrieval, long-term context and planning.',
    contentType: '论文',
    topics: ['LLM agent memory'],
    tags: ['LLM', 'agent', 'memory'],
    aliases: [],
    confidence: 0.81,
    source: 'ai_naming',
    model: 'gpt-test',
    extraction: { status: 'ok', source: 'html', warnings: [] },
    generatedAt: 1,
    updatedAt: 1
  })
  const summaryOnly = indexBookmarkForSearch(bookmark({
    id: 'summary-only',
    title: 'ZZZ',
    normalizedTitle: 'zzz',
    normalizedUrl: 'zzz.test',
    domain: 'zzz.test',
    path: 'Root'
  }), {
    schemaVersion: 1,
    bookmarkId: 'summary-only',
    url: 'https://zzz.test',
    normalizedUrl: 'https://zzz.test',
    duplicateKey: 'https://zzz.test',
    title: 'ZZZ',
    path: 'Root',
    summary: 'a a a a noisy repeated text',
    contentType: '',
    topics: [],
    tags: [],
    aliases: [],
    confidence: 0.2,
    source: 'ai_naming',
    model: 'gpt-test',
    extraction: { status: 'limited', source: 'fallback', warnings: [] },
    generatedAt: 1,
    updatedAt: 1
  })

  const semanticResults = searchBookmarks('LLM agent memory', [indexed])
  assert.equal(semanticResults[0]?.id, 'agent-memory')
  assert.ok(semanticResults[0]?.matchReasons.some((reason) => reason.includes('标签') || reason.includes('摘要')))

  assert.equal(searchBookmarks('a', [summaryOnly]).length, 0)
})

test('cooperative search can be cancelled by caller state', async () => {
  const bookmarks = Array.from({ length: 1301 }, (_value, index) => {
    return indexBookmarkForSearch(bookmark({
      id: `bookmark-${index}`,
      title: `Bookmark ${index}`,
      normalizedTitle: `bookmark ${index}`,
      normalizedUrl: `example.com/${index}`
    }))
  })
  let active = true

  let cancellationMessage = ''
  try {
    await searchBookmarksCooperatively('bookmark', bookmarks, {
      isActive: () => active,
      yieldWork: async () => {
        active = false
      }
    })
  } catch (error) {
    cancellationMessage = error instanceof Error ? error.message : String(error)
  }
  assert.equal(cancellationMessage, 'search-cancelled')
})
