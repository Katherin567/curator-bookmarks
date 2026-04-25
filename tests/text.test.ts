import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  buildDuplicateKey,
  displayUrl,
  extractDomain,
  normalizeText,
  normalizeUrl,
  stripCommonUrlPrefix
} from '../src/shared/text.js'

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
