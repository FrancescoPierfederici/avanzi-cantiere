// Foto nei risultati: due card vicine non mostrano mai lo stesso file, se possibile.
// Ogni voce ha più foto (gres-grigio.webp, gres-grigio-2.webp…): nella lista si alternano
// in base alla posizione, ma solo fra quelle coerenti con formato e colore del lotto (fotoSe nel catalogo).
// La foto mostrata viene ricordata, così la scheda aperta dalla card mostra la stessa.
import fotoJson from '../data/foto.json'
import { CATALOGO, fotoAdatte } from '../data/catalogo'
import type { Lotto } from '../data/types'

const CHIAVI = CATALOGO.map((v) => v.foto as string).sort((a, b) => b.length - a.length)

/** "/lotti/gres-grigio-2.webp" → "gres-grigio" (prefisso più lungo); null per le foto caricate */
function voceDi(foto: string): string | null {
  const m = foto.match(/^\/lotti\/([^/]+)\.webp$/)
  return m ? (CHIAVI.find((k) => m[1] === k || m[1].startsWith(k + '-')) ?? null) : null
}

const FOTO_PER_VOCE = new Map<string, string[]>()
for (const f of fotoJson as string[]) {
  const v = voceDi(f)
  if (v) FOTO_PER_VOCE.set(v, [...(FOTO_PER_VOCE.get(v) ?? []), f])
}

/** Le foto della voce adatte a questo lotto. */
function adatte(l: Lotto, v: string): string[] {
  const voce = CATALOGO.find((x) => x.foto === v)
  const files = FOTO_PER_VOCE.get(v) ?? []
  return voce ? fotoAdatte(voce, files, l.formato, l.colore) : files
}

/** id del lotto → foto da mostrare nella lista, nell'ordine dato */
export function fotoInLista(lista: Lotto[]): Map<string, string> {
  const ultima = new Map<string, number>()
  const out = new Map<string, string>()
  for (const l of lista) {
    const v = voceDi(l.foto)
    const files = v ? adatte(l, v) : []
    if (!v || files.length < 2) {
      out.set(l.id, l.foto)
      continue
    }
    const k = files.join()
    const prima = ultima.get(k)
    const i = prima === undefined ? Math.max(0, files.indexOf(l.foto)) : (prima + 1) % files.length
    ultima.set(k, i)
    out.set(l.id, files[i])
  }
  return out
}

const CHIAVE = 'avanzi:fotoMostrate'

/** codice lotto → foto vista nei risultati (solo quando diversa da quella del lotto) */
export function ricordaFotoMostrate(voci: Record<string, string>) {
  try {
    window.sessionStorage.setItem(CHIAVE, JSON.stringify(voci))
  } catch {
    /* storage non disponibile: la scheda mostra la foto del lotto */
  }
}

export function fotoMostrata(lotto: Lotto): string {
  try {
    const f = (JSON.parse(window.sessionStorage.getItem(CHIAVE) ?? '{}') as Record<string, string>)[lotto.codice]
    // solo un'altra foto della stessa voce, e adatta a questo lotto
    const v = voceDi(lotto.foto)
    if (f && v && voceDi(f) === v && adatte(lotto, v).includes(f)) return f
  } catch {
    /* valore illeggibile */
  }
  return lotto.foto
}

/** Le foto di una voce di catalogo ("gres-grigio" → gres-grigio.webp, gres-grigio-2.webp). */
export const fotoDellaVoce = (voce: string): string[] => FOTO_PER_VOCE.get(voce) ?? []
