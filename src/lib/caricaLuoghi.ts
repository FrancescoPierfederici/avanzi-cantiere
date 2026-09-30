// L'elenco dei comuni italiani nel browser. Il file (~300 KB, ~130 KB compressi) è un pacchetto separato:
// si scarica solo quando serve (primo focus sulla ricerca, o una ricerca che nomina un luogo sconosciuto).

import type { Luogo } from '../data/types'
import { parseLuoghi } from './luoghi'

let elenco: Luogo[] | null = null
let promessa: Promise<Luogo[]> | null = null

/** L'elenco, se è già stato caricato. */
export const luoghiCaricati = () => elenco

export function caricaLuoghi(): Promise<Luogo[]> {
  promessa ??= import('../data/comuni-italia.txt?raw')
    .then((m) => (elenco = parseLuoghi(m.default)))
    .catch((e) => {
      promessa = null // si potrà riprovare
      throw e
    })
  return promessa
}

/** Carica in anticipo, quando il browser è libero (primo focus sulla ricerca). */
export function precaricaLuoghi() {
  if (elenco || promessa) return
  const via = () => void caricaLuoghi().catch(() => {})
  if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(via, { timeout: 2000 })
  else window.setTimeout(via, 300)
}
