// Codice a barre decorativo, derivato in modo stabile dal codice lotto.
// Non è un barcode leggibile: è un segno grafico da etichetta di bancale.

function barre(codice: string): { x: number; w: number }[] {
  const out: { x: number; w: number }[] = []
  let x = 0
  const push = (w: number, gap: number) => {
    out.push({ x, w })
    x += w + gap
  }
  push(1, 1)
  push(1, 2) // guardia iniziale
  for (let i = 0; i < codice.length; i++) {
    const n = codice.charCodeAt(i) * 31 + i * 17
    push((n % 3) + 1, ((n >> 2) % 2) + 1)
    push(((n >> 3) % 2) + 1, ((n >> 4) % 3) + 1)
  }
  push(1, 1)
  push(1, 0) // guardia finale
  return out
}

export function Barcode({ codice, className = '' }: { codice: string; className?: string }) {
  const b = barre(codice)
  const larghezza = b[b.length - 1].x + b[b.length - 1].w
  return (
    <svg viewBox={`0 0 ${larghezza} 20`} preserveAspectRatio="none" className={className} aria-hidden="true" focusable="false">
      {b.map((r, i) => (
        <rect key={i} x={r.x} y={0} width={r.w} height={20} fill="currentColor" />
      ))}
    </svg>
  )
}
