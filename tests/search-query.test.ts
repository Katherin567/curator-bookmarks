import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  buildSearchTextQuery,
  matchesParsedSearchQuery,
  parseSearchQuery
} from '../src/shared/search-query.js'

test('parses quoted phrases with adjacent structured operators', () => {
  const parsed = parseSearchQuery('"data grid" site:github.com folder: "Frontend Resources" -"短视频"')

  assert.deepEqual(parsed.textTerms, ['data grid'])
  assert.deepEqual(parsed.siteFilters, ['github.com'])
  assert.deepEqual(parsed.folderFilters, ['frontend resources'])
  assert.deepEqual(parsed.excludedTerms, ['短视频'])
  assert.equal(buildSearchTextQuery(parsed), 'data grid')
  assert.equal(matchesParsedSearchQuery(parsed, {
    searchText: 'react data grid docs',
    domain: 'github.com',
    url: 'github.com/reactjs/react.dev',
    path: 'Frontend Resources / React Docs',
    type: '技术文档',
    dateAdded: Date.now()
  }), true)
  assert.equal(matchesParsedSearchQuery(parsed, {
    searchText: 'react data grid 短视频',
    domain: 'github.com',
    url: 'github.com/reactjs/react.dev',
    path: 'Frontend Resources / React Docs',
    type: '技术文档',
    dateAdded: Date.now()
  }), false)
})

test('parses flexible Chinese date filters for structured search', () => {
  const now = new Date(2026, 4, 4, 15).getTime()
  const recentWeeks = parseSearchQuery('React 最近 2 周 site:github.com', now)
  const yesterday = parseSearchQuery('昨天 type:文档', now)
  const lastMonth = parseSearchQuery('上个月 folder:资料', now)

  assert.deepEqual(recentWeeks.textTerms, ['react'])
  assert.deepEqual(recentWeeks.siteFilters, ['github.com'])
  assert.equal(recentWeeks.dateRange?.label, '最近 2 周')
  assert.equal(recentWeeks.dateRange?.from, new Date(2026, 3, 21).getTime())
  assert.equal(recentWeeks.dateRange?.to, new Date(2026, 4, 4, 23, 59, 59, 999).getTime())
  assert.ok(recentWeeks.chips.some((chip) => chip.label === '时间：最近 2 周'))

  assert.deepEqual(yesterday.textTerms, [])
  assert.deepEqual(yesterday.typeFilters, ['文档'])
  assert.equal(yesterday.dateRange?.label, '昨天')
  assert.equal(yesterday.dateRange?.from, new Date(2026, 4, 3).getTime())
  assert.equal(yesterday.dateRange?.to, new Date(2026, 4, 4).getTime() - 1)

  assert.equal(lastMonth.dateRange?.label, '上个月')
  assert.equal(lastMonth.dateRange?.from, new Date(2026, 3, 1).getTime())
  assert.equal(lastMonth.dateRange?.to, new Date(2026, 4, 1).getTime() - 1)
})

test('matches parsed date ranges inclusively with structured filters', () => {
  const now = new Date(2026, 4, 4, 15).getTime()
  const parsed = parseSearchQuery('最近 3 天 folder:frontend', now)

  assert.equal(matchesParsedSearchQuery(parsed, {
    searchText: 'react table',
    path: 'Bookmarks Bar / Frontend',
    dateAdded: new Date(2026, 4, 2, 8).getTime()
  }), true)
  assert.equal(matchesParsedSearchQuery(parsed, {
    searchText: 'react table',
    path: 'Bookmarks Bar / Frontend',
    dateAdded: new Date(2026, 4, 1, 23, 59, 59, 999).getTime()
  }), false)
})
