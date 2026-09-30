// Regole del ritiro: quantità prenotabili, giorni di apertura della sede, fasce orarie.
import { CATALOGO } from '../data/catalogo'
import type { Azienda, Lotto } from '../data/types'

export const FASCE = ['8–10', '10–12', '14–16', '16–18'] as const
const FASCE_SABATO = ['8–10', '10–12'] as const

/** Passo della quantità: per i m² una scatola intera del formato (se nota), altrimenti un'unità. */
export function passoQuantita(l: Lotto): number {
  if (l.unita !== 'm²') return 1
  for (const v of CATALOGO) {
    const f = v.formati.find((x) => x.f === l.formato && x.scatolaM2)
    if (f?.scatolaM2) return f.scatolaM2
  }
  return 1
}

/** Contenuto del QR: codice di ritiro, lotto, giorno e fascia (leggibile anche senza app). */
export const testoQR = (codice: string, lotto: string, giorno: string, fascia: string) => `AVANZI RITIRO ${codice} LOTTO ${lotto} ${giorno} ${fascia}`

export interface Giorno {
  iso: string
  fasce: readonly string[]
}

/**
 * Prossimi giorni di apertura della sede. Rivendite e showroom: anche il sabato mattina.
 * Imprese e artigiani: dal lunedì al venerdì. Domenica chiuso per tutti.
 */
export function giorniDiRitiro(a: Azienda, quanti = 10, da = new Date()): Giorno[] {
  const out: Giorno[] = []
  const d = new Date(Date.UTC(da.getFullYear(), da.getMonth(), da.getDate()))
  while (out.length < quanti) {
    d.setUTCDate(d.getUTCDate() + 1) // dal giorno dopo
    const dow = d.getUTCDay()
    if (dow === 0) continue
    if (dow === 6 && !(a.tipo === 'rivendita' || a.tipo === 'showroom')) continue
    out.push({ iso: d.toISOString().slice(0, 10), fasce: dow === 6 ? FASCE_SABATO : FASCE })
  }
  return out
}

const GIORNI = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab']
const MESI = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic']
/** { settimana: "mar", numero: "30", mese: "set" } */
export function partiData(iso: string) {
  const [a, m, g] = iso.split('-').map(Number)
  const dow = new Date(Date.UTC(a, m - 1, g)).getUTCDay()
  return { settimana: GIORNI[dow], numero: String(g), mese: MESI[m - 1] }
}
