// Ricerca sui lotti a partire da una Query. Funzione pura: i dati arrivano come parametri.

import type { Azienda, Comune, ComuneId, Lotto } from '../data/types.ts'
import { distanzaKm } from './geo.ts'
import { coloreCorrisponde, misuraCorrisponde, normalizza, type Query } from './parser.ts'

export interface Trovato {
  lotto: Lotto
  azienda: Azienda
  km: number
  /** soddisfa tutti i filtri richiesti */
  esatto: boolean
}

export interface Risultato {
  query: Query
  riferimento: Comune
  trovati: Trovato[]
  /** quanti dei trovati soddisfano tutti i filtri (sono i primi della lista) */
  nEsatti: number
  /** cosa è stato allargato perché il filtro stretto non trovava nulla */
  allargata?: string
  /** true se la query non chiedeva nulla oltre al luogo */
  soloZona: boolean
}

interface Dati {
  lotti: Lotto[]
  aziende: Azienda[]
  comuni: Comune[]
  zonaPredefinita: ComuneId
  /** punto di riferimento già deciso (un comune fuori dai 7 della demo) */
  riferimento?: Comune
}

const MAX_RISULTATI = 30
const MAX_SIMILI = 12
const RAGGIO_ZONA_KM = 30

export function cerca(query: Query, { lotti, aziende, comuni, zonaPredefinita, riferimento: rif }: Dati): Risultato {
  const riferimento = rif ?? comuni.find((c) => c.id === (query.comune ?? zonaPredefinita)) ?? comuni[0]
  const aziendaPerId = new Map(aziende.map((a) => [a.id, a]))
  const conKm = (l: Lotto) => {
    const azienda = aziendaPerId.get(l.aziendaId)!
    return { lotto: l, azienda, km: distanzaKm(riferimento.lat, riferimento.lng, azienda.lat, azienda.lng) }
  }

  const soloZona = !query.categoria && !query.misura && !query.colore
  const allargamenti: string[] = []

  // 1. categoria (+ sottotipo, se c'è)
  let base = query.categoria ? lotti.filter((l) => l.categoria === query.categoria) : lotti
  if (query.sottotipo) {
    const conSotto = base.filter((l) => normalizza(l.titolo).includes(query.sottotipo!))
    if (conSotto.length) base = conSotto
    else allargamenti.push(query.etichetta?.toLowerCase() ?? query.sottotipo)
  }

  // 2. misura e colore: prima stretti, poi come punteggio
  const okMisura = (l: Lotto) => !query.misura || misuraCorrisponde(l.formato, query.misura)
  const okColore = (l: Lotto) => !query.colore || coloreCorrisponde(l.colore, query.colore)
  const esatti = base.filter((l) => okMisura(l) && okColore(l))

  const punteggio = (l: Lotto) => (query.misura && okMisura(l) ? 2 : 0) + (query.colore && okColore(l) ? 1 : 0)
  const perVicinanza = (a: Trovato, b: Trovato) => a.km - b.km

  // esatti per primi (dal più vicino); poi, se c'è una categoria, i simili della stessa categoria
  const trovatiEsatti: Trovato[] = esatti.map((l) => ({ ...conKm(l), esatto: allargamenti.length === 0 })).sort(perVicinanza)
  const idEsatti = new Set(esatti.map((l) => l.id))
  const simili: Trovato[] = query.categoria
    ? base
        .filter((l) => !idEsatti.has(l.id))
        .map((l) => ({ ...conKm(l), esatto: false, p: punteggio(l) }))
        .sort((a, b) => b.p - a.p || a.km - b.km)
        .slice(0, MAX_SIMILI)
        .map(({ p: _p, ...t }) => t)
    : []

  if (esatti.length === 0) {
    if (query.misura && !base.some(okMisura)) allargamenti.push(`${query.misura.join('x')}`)
    if (query.colore && !base.some(okColore)) allargamenti.push(query.colore.join(' '))
    if (query.misura && query.colore && allargamenti.length === 0) allargamenti.push(`${query.misura.join('x')} ${query.colore.join(' ')}`)
  }
  let trovati = [...trovatiEsatti, ...(esatti.length === 0 && !query.categoria ? [] : simili)]
  // "lotti vicino a X" senza altri filtri: solo quelli davvero vicini
  if (soloZona) {
    const vicini = trovati.filter((t) => t.km <= RAGGIO_ZONA_KM)
    trovati = vicini.length ? vicini : trovati.slice(0, 10)
  }

  return {
    query,
    riferimento,
    trovati: trovati.slice(0, MAX_RISULTATI),
    nEsatti: Math.min(trovatiEsatti.filter((t) => t.esatto).length, MAX_RISULTATI),
    allargata: allargamenti.length ? allargamenti.join(', ') : undefined,
    soloZona,
  }
}

/** Oltre questa distanza dal comune i risultati esatti restano nella lista ma fuori dall'inquadratura. */
export const RAGGIO_INQUADRATURA_KM = 25

/** Su mobile la mappa è piccola: si inquadrano solo gli esatti più vicini, così le colonne restano grandi. */
export const MAX_INQUADRATI_MOBILE = 5

/**
 * Risultati da inquadrare dopo il volo: gli esatti entro 25 km dal comune, dal più vicino,
 * al massimo `max` (se nessuno è così vicino, il più vicino). Senza esatti: i simili, stessa regola.
 */
export function daInquadrare(r: Risultato, max = Infinity): Trovato[] {
  const base = r.nEsatti > 0 || r.soloZona ? r.trovati.filter((t) => t.esatto || r.soloZona) : r.trovati
  const vicini = base.filter((t) => t.km <= RAGGIO_INQUADRATURA_KM).slice(0, max)
  return vicini.length ? vicini : base.slice(0, 1)
}
