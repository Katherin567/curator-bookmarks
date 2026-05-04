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
