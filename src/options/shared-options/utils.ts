import { availabilityState } from './state.js'

interface PathTitleComparable {
  path?: string
  title?: string
}

export function isInteractionLocked(): boolean {
  return (
    availabilityState.deleting ||
    availabilityState.retestingSelection ||
    availabilityState.stopRequested ||
    (availabilityState.running && !availabilityState.paused)
  )
}

export function compareByPathTitle(left: PathTitleComparable, right: PathTitleComparable): number {
  return (
    String(left.path || '').localeCompare(String(right.path || ''), 'zh-CN') ||
    String(left.title || '').localeCompare(String(right.title || ''), 'zh-CN')
  )
}

export function syncSelectionSet(selectionSet: Set<unknown>, validIds: Set<string>): void {
  for (const selectedId of [...selectionSet]) {
    if (!validIds.has(String(selectedId))) {
      selectionSet.delete(selectedId)
    }
  }
}

export function formatDateTime(timestamp: number): string {
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(timestamp)
}

export function setModalHidden(backdrop: HTMLElement | null | undefined, open: boolean): void {
  if (!backdrop) {
    return
  }

  if (!open) {
    const active = document.activeElement
    if (active && active !== document.body && backdrop.contains(active)) {
      const activeElement = active as HTMLElement
      activeElement.blur()
    }
  }

  backdrop.classList.toggle('hidden', !open)
  backdrop.setAttribute('aria-hidden', open ? 'false' : 'true')
}
