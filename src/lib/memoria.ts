// Preferenze del singolo visitatore in localStorage. Può essere assente o bloccato:
// ogni accesso è protetto e la pagina funziona anche senza.
import type { ComuneId } from '../data/types'

const VISITATO = 'avanzi:visitato'
const ZONA = 'avanzi:zona'

function leggi(chiave: string): string | null {
  try {
    return window.localStorage.getItem(chiave)
  } catch {
    return null
  }
}

function scrivi(chiave: string, valore: string) {
  try {
    window.localStorage.setItem(chiave, valore)
  } catch {
    /* storage non disponibile: pazienza */
  }
}

export const memoria = {
  giaVisitato: () => leggi(VISITATO) === '1',
  segnaVisitato: () => scrivi(VISITATO, '1'),
  zona: (validi: readonly string[]): ComuneId | null => {
    const z = leggi(ZONA)
    return z && validi.includes(z) ? (z as ComuneId) : null
  },
  salvaZona: (z: ComuneId) => scrivi(ZONA, z),
}
