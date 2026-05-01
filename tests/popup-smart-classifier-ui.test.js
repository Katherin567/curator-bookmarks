import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'

function readProjectFile(path) {
  return readFileSync(resolve(process.cwd(), path), 'utf8')
}

test('smart classifier result title input does not render a redundant indicator slot', () => {
  const popupSource = readProjectFile('src/popup/popup.ts')
  const start = popupSource.indexOf('function renderSmartResultCard')
  const end = popupSource.indexOf('function renderSmartRecommendation')

  assert.notEqual(start, -1)
  assert.notEqual(end, -1)

  const resultCardSource = popupSource.slice(start, end)
  assert.match(resultCardSource, /id="smart-title-input"/)
  assert.doesNotMatch(resultCardSource, /smart-edit-indicator/)
})

test('smart classifier active state hides advanced search help controls', () => {
  const popupStyles = readProjectFile('src/popup/popup.css')

  assert.match(
    popupStyles,
    /body\.smart-active \.search-help-toggle,\s*body\.smart-active \.search-help-panel\s*\{[^}]*display:\s*none;/s
  )
})
