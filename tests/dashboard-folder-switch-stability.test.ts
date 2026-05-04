import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import {
  shouldRevealDashboardPanelAfterRender,
  shouldResetDashboardPanelRevealForSectionEntry,
  shouldResetDashboardPanelRevealForRender,
  shouldResetDashboardVirtualScrollForFilterChange
} from '../src/options/sections/dashboard.js'

test('dashboard section entry resets reveal before showing cached cards', () => {
  assert.equal(
    shouldResetDashboardPanelRevealForSectionEntry({
      previousSectionKey: 'general',
      nextSectionKey: 'dashboard'
    }),
    true
  )
  assert.equal(
    shouldResetDashboardPanelRevealForSectionEntry({
      previousSectionKey: 'dashboard',
      nextSectionKey: 'dashboard'
    }),
    false
  )
  assert.equal(
    shouldResetDashboardPanelRevealForSectionEntry({
      previousSectionKey: 'dashboard',
      nextSectionKey: 'general'
    }),
    false
  )
})

test('dashboard folder switches do not reset the ready panel reveal', () => {
  assert.equal(
    shouldResetDashboardPanelRevealForRender({ catalogLoading: false, viewReady: true }),
    false
  )
  assert.equal(
    shouldResetDashboardPanelRevealForRender({ catalogLoading: false, viewReady: false }),
    false
  )
  assert.equal(
    shouldResetDashboardPanelRevealForRender({ catalogLoading: true, viewReady: true }),
    true
  )
})

test('dashboard folder switch update state masks partially rendered cards', () => {
  const testDir = dirname(fileURLToPath(import.meta.url))
  const cssPath = resolve(testDir, '../../src/options/options.css')
  const css = readFileSync(cssPath, 'utf8')
  const updatingRule = css.match(/\.dashboard-card-grid\.is-updating\s*\{[\s\S]*?\n\}/)?.[0] || ''

  assert.doesNotMatch(updatingRule, /content-visibility/)
  assert.match(css, /\.dashboard-card-grid\.is-updating\s*>\s*\*\s*\{[\s\S]*?opacity:\s*0/)
  assert.match(css, /\.dashboard-card-grid\.is-updating::before/)
  assert.match(css, /\.dashboard-card-grid\.is-updating::after/)
})

test('dashboard initial reveal waits for the latest committed card render', () => {
  assert.equal(
    shouldRevealDashboardPanelAfterRender({
      catalogLoading: true,
      viewReady: false,
      revealFramePending: false,
      latestRenderVersion: 1,
      revealRenderVersion: 1,
      committedRenderVersion: 1
    }),
    false,
    'catalog loading must keep the initial dashboard hidden'
  )

  assert.equal(
    shouldRevealDashboardPanelAfterRender({
      catalogLoading: false,
      viewReady: false,
      revealFramePending: false,
      latestRenderVersion: 2,
      revealRenderVersion: 2,
      committedRenderVersion: 1
    }),
    false,
    'dashboard must not reveal before the card grid commits'
  )

  assert.equal(
    shouldRevealDashboardPanelAfterRender({
      catalogLoading: false,
      viewReady: false,
      revealFramePending: false,
      latestRenderVersion: 3,
      revealRenderVersion: 2,
      committedRenderVersion: 2
    }),
    false,
    'stale reveal frames must not expose a previous partial render'
  )

  assert.equal(
    shouldRevealDashboardPanelAfterRender({
      catalogLoading: false,
      viewReady: false,
      revealFramePending: false,
      latestRenderVersion: 3,
      revealRenderVersion: 3,
      committedRenderVersion: 3
    }),
    true,
    'dashboard can reveal only after the current card render has committed'
  )
})

test('dashboard initial loading state hides real cards instead of only fading them', () => {
  const testDir = dirname(fileURLToPath(import.meta.url))
  const cssPath = resolve(testDir, '../../src/options/options.css')
  const css = readFileSync(cssPath, 'utf8')
  const notReadyRule = css.match(
    /\.dashboard-panel\[data-dashboard-ready="false"\]\s+\.dashboard-title-row,[\s\S]*?\.dashboard-panel\[data-dashboard-ready="false"\]\s+\.dashboard-results-group\s*\{[\s\S]*?\n\}/
  )?.[0] || ''

  assert.match(notReadyRule, /opacity:\s*0/)
  assert.match(notReadyRule, /visibility:\s*hidden/)
  assert.match(notReadyRule, /pointer-events:\s*none/)
})

test('dashboard folder filter changes preserve virtual scroll reset state', () => {
  assert.equal(
    shouldResetDashboardVirtualScrollForFilterChange({
      previousKey: 'query\u0001domain\u0001month\u0001date-desc',
      nextKey: 'query\u0001domain\u0001month\u0001date-desc',
      reason: 'folder'
    }),
    false
  )
  assert.equal(
    shouldResetDashboardVirtualScrollForFilterChange({
      previousKey: 'query\u0001domain\u0001month\u0001date-desc',
      nextKey: 'query\u0001folder-2\u0001domain\u0001month\u0001date-desc',
      reason: 'folder'
    }),
    false
  )
  assert.equal(
    shouldResetDashboardVirtualScrollForFilterChange({
      previousKey: '',
      nextKey: 'new-query\u0001folder-2\u0001domain\u0001month\u0001date-desc',
      reason: 'query'
    }),
    true
  )
})
