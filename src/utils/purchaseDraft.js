export function buildPurchaseDraft(rows) {
  return rows
    .map(row => ({
      product_id: Number(row.id || row.product_id),
      quantity: Math.max(1, Math.ceil(Number(row.suggested || row.quantity || row.qty || 1))),
      source: row.source || 'replenish'
    }))
    .filter(item => item.product_id && item.quantity > 0)
}

export function stringifyPurchaseDraft(rows) {
  const draft = buildPurchaseDraft(rows)
  return draft.length ? JSON.stringify(draft) : ''
}

export function parsePurchaseDraft(value) {
  const raw = Array.isArray(value) ? value[0] : value
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return buildPurchaseDraft(parsed)
  } catch {
    return []
  }
}
