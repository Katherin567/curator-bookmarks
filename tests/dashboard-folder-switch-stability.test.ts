import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  shouldResetDashboardPanelRevealForRender,
  shouldResetDashboardVirtualScrollForFilterChange
} from '../src/options/sections/dashboard.js'

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
