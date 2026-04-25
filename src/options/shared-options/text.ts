export function truncateText(value: unknown, maxLength: number): string {
  const safeText = String(value || '').trim()
  const limit = Math.max(1, Number(maxLength) || 1)
  if (safeText.length <= limit) {
    return safeText
  }

  return `${safeText.slice(0, Math.max(limit - 1, 1)).trim()}…`
}
