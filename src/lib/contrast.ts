// Rapporto di contrasto WCAG 2.x tra due colori hex.

function luminanza(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrasto(a: string, b: string): number {
  const [l1, l2] = [luminanza(a), luminanza(b)].sort((x, y) => y - x)
  return (l1 + 0.05) / (l2 + 0.05)
}
