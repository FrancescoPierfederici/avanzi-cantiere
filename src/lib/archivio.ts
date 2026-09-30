// Archivio locale della demo: tutto ciò che l'utente crea o cambia, in localStorage.
// Lotti pubblicati, quantità residue dopo le prenotazioni, avvisi, notifiche, prenotazioni.
// Niente backend: ogni vista legge da qui tramite useArchivio() e i selettori sotto.
import { useSyncExternalStore } from 'react'
import { aziende as aziendeBase, comuni, lotti as lottiBase } from '../data'
import type { Azienda, ComuneId, Lotto, Unita } from '../data/types'
import { distanzaKm } from './geo'
import { coloreCorrisponde, misuraCorrisponde, normalizza, type Query } from './parser'

export interface Avviso {
  id: string
  testo: string
  query: Query
  /** zona di riferimento per la distanza */
  comune: ComuneId
  /** nome e posizione della zona (per le città fuori dalla zona demo) */
  luogo?: { nome: string; lat: number; lng: number }
  raggioKm: number
  creato: string
}

export interface Notifica {
  id: string
  avvisoId: string
  lottoCodice: string
  testo: string
  letta: boolean
  creata: string
}

export interface Prenotazione {
  codice: string
  lottoId: string
  lottoCodice: string
  titolo: string
  quantita: number
  unita: Unita
  kg: number
  totale: number
  risparmio: number
  /** yyyy-mm-dd */
  giorno: string
  fascia: string
  sede: { nome: string; indirizzo: string }
  contatti: { nome: string; telefono: string; email: string }
  pagamento: 'al-ritiro' | 'simulato'
  creata: string
}

interface Dati {
  versione: 1
  pubblicati: { lotto: Lotto; azienda: Azienda }[]
  /** lottoId → quantità residua (solo per i lotti toccati da prenotazioni) */
  residui: Record<string, number>
  avvisi: Avviso[]
  notifiche: Notifica[]
  prenotazioni: Prenotazione[]
}

const CHIAVE = 'avanzi:archivio'
const VUOTO: Dati = { versione: 1, pubblicati: [], residui: {}, avvisi: [], notifiche: [], prenotazioni: [] }

// ── lettura, scrittura, iscrizioni ───────────────────────────────────────

function carica(): Dati {
  try {
    const s = window.localStorage.getItem(CHIAVE)
    if (!s) return VUOTO
    const d = JSON.parse(s) as Dati
    return d.versione === 1 ? { ...VUOTO, ...d } : VUOTO
  } catch {
    return VUOTO
  }
}

let dati: Dati = typeof window === 'undefined' ? VUOTO : carica()
const ascoltatori = new Set<() => void>()
/** l'ultimo salvataggio non è riuscito (spazio pieno): i dati restano solo in questa sessione */
let soloSessione = false

function salva(nuovi: Dati) {
  dati = nuovi
  try {
    window.localStorage.setItem(CHIAVE, JSON.stringify(nuovi))
    soloSessione = false
  } catch {
    soloSessione = true
  }
  ascoltatori.forEach((f) => f())
}

// un'altra finestra ha cambiato l'archivio (es. ha pubblicato un lotto): si ricarica
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key !== CHIAVE) return
    dati = carica()
    ascoltatori.forEach((f) => f())
  })
}

function iscrivi(f: () => void) {
  ascoltatori.add(f)
  return () => ascoltatori.delete(f)
}

export function useArchivio(): Dati {
  return useSyncExternalStore(iscrivi, () => dati)
}

export const archivioSoloSessione = () => soloSessione

/** true se l'ultimo salvataggio è fallito per memoria del browser piena (si aggiorna da solo). */
export function useMemoriaPiena(): boolean {
  return useSyncExternalStore(iscrivi, () => soloSessione)
}

// ── zone generate (città fuori dalla zona demo, vedi zone.ts) ─────────────
// Non stanno in localStorage: si rigenerano uguali dal nome del comune.

const zone = new Map<string, { aziende: Azienda[]; lotti: Lotto[] }>()
let versioneZone = 0

export function registraZona(chiave: string, aziende: Azienda[], lotti: Lotto[]) {
  if (zone.has(chiave)) return
  zone.set(chiave, { aziende, lotti })
  versioneZone++
}

// ── selettori (memorizzati per istantanea) ───────────────────────────────

interface Derivati {
  versione: number
  lotti: Lotto[]
  tutti: Lotto[]
  aziende: Azienda[]
  perId: Map<string, Azienda>
  perZona: Map<string, Lotto[]>
}
const memo = new WeakMap<Dati, Derivati>()

function derivati(d: Dati): Derivati {
  const m = memo.get(d)
  if (m && m.versione === versioneZone) return m
  const conResiduo = (l: Lotto): Lotto => {
    const r = d.residui[l.id]
    if (r === undefined || r === l.quantita) return l
    const peso = Math.round((l.pesoKg * r) / l.quantita)
    return { ...l, quantita: r, pesoKg: peso, stato: r <= 0 ? 'venduto' : l.stato }
  }
  // i pubblicati per primi: sono i più recenti
  const demo = [...d.pubblicati.map((p) => p.lotto), ...lottiBase].map(conResiduo)
  const perZona = new Map([...zone].map(([k, z]) => [k, z.lotti.map(conResiduo)]))
  const tutti = [...demo, ...[...perZona.values()].flat()]
  const aziende = [
    ...aziendeBase,
    ...d.pubblicati.map((p) => p.azienda).filter((a, i, arr) => arr.findIndex((x) => x.id === a.id) === i),
    ...[...zone.values()].flatMap((z) => z.aziende),
  ]
  const nuovo = { versione: versioneZone, tutti, lotti: demo.filter((l) => l.quantita > 0), aziende, perId: new Map(aziende.map((a) => [a.id, a])), perZona }
  memo.set(d, nuovo)
  return nuovo
}

/** Lotti della zona demo ancora disponibili (quantità residua > 0), pubblicati compresi. */
export const lottiAttivi = (d: Dati = dati) => derivati(d).lotti
/** Lotti disponibili di una città generata. */
export const lottiDellaZona = (chiave: string, d: Dati = dati) => (derivati(d).perZona.get(chiave) ?? []).filter((l) => l.quantita > 0)
/** Tutti i lotti, anche quelli già prenotati per intero e quelli delle città generate (per la scheda). */
export const tuttiILotti = (d: Dati = dati) => derivati(d).tutti
export const tutteLeAziende = (d: Dati = dati) => derivati(d).aziende
export const aziendaDi = (l: Lotto, d: Dati = dati): Azienda => derivati(d).perId.get(l.aziendaId)!
export const lottoPerCodice = (codice: string, d: Dati = dati) => derivati(d).tutti.find((l) => l.codice === codice)

const KG_BASE = lottiBase.reduce((s, l) => s + l.pesoKg, 0)
/** kg rimessi in circolo: i lotti dell'archivio più quelli pubblicati (sale alla pubblicazione). */
export const kgInCircolo = (d: Dati = dati) => KG_BASE + d.pubblicati.reduce((s, p) => s + p.lotto.pesoKg, 0)
/** kg salvati dalla discarica da chi usa la demo: sale con le prenotazioni. */
export const kgSalvatiDaTe = (d: Dati = dati) => d.prenotazioni.reduce((s, p) => s + p.kg, 0)
export const notificheNonLette = (d: Dati = dati) => d.notifiche.filter((n) => !n.letta).length

// ── azioni ────────────────────────────────────────────────────────────────

const ora = () => new Date().toISOString()
const idCasuale = (prefisso: string) => `${prefisso}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

/** Nome e posizione della zona di un avviso. */
export const luogoAvviso = (av: Avviso) => av.luogo ?? comuni.find((x) => x.id === av.comune)!

/** Un lotto corrisponde a un avviso? Stessi filtri della ricerca, entro il raggio dalla zona dell'avviso. */
export function corrisponde(l: Lotto, a: Azienda, av: Avviso): boolean {
  const q = av.query
  if (q.categoria && l.categoria !== q.categoria) return false
  if (q.sottotipo && !normalizza(l.titolo).includes(q.sottotipo)) return false
  if (q.misura && !misuraCorrisponde(l.formato, q.misura)) return false
  if (q.colore && !coloreCorrisponde(l.colore, q.colore)) return false
  const c = luogoAvviso(av)
  return distanzaKm(c.lat, c.lng, a.lat, a.lng) <= av.raggioKm
}

/** Pubblica un lotto; restituisce le notifiche nate dagli avvisi che corrispondono. */
export function pubblica(lotto: Lotto, azienda: Azienda): Notifica[] {
  const nuove: Notifica[] = dati.avvisi
    .filter((av) => corrisponde(lotto, azienda, av))
    .map((av) => {
      const c = luogoAvviso(av)
      const km = distanzaKm(c.lat, c.lng, azienda.lat, azienda.lng)
      return {
        id: idCasuale('N'),
        avvisoId: av.id,
        lottoCodice: lotto.codice,
        testo: `È arrivato: ${lotto.titolo}, a ${km < 10 ? km.toFixed(1).replace('.', ',') : Math.round(km)} km da ${c.nome}`,
        letta: false,
        creata: ora(),
      }
    })
  salva({ ...dati, pubblicati: [{ lotto, azienda }, ...dati.pubblicati], notifiche: [...nuove, ...dati.notifiche] })
  return nuove
}

export function aggiungiAvviso(a: Omit<Avviso, 'id' | 'creato'>): Avviso {
  const avviso = { ...a, id: idCasuale('A'), creato: ora() }
  salva({ ...dati, avvisi: [avviso, ...dati.avvisi] })
  return avviso
}

export function modificaAvviso(id: string, cambi: Partial<Omit<Avviso, 'id' | 'creato'>>) {
  salva({ ...dati, avvisi: dati.avvisi.map((a) => (a.id === id ? { ...a, ...cambi } : a)) })
}

export function eliminaAvviso(id: string) {
  salva({ ...dati, avvisi: dati.avvisi.filter((a) => a.id !== id), notifiche: dati.notifiche.filter((n) => n.avvisoId !== id) })
}

export function segnaNotificheLette(ids?: string[]) {
  if (!dati.notifiche.some((n) => !n.letta && (!ids || ids.includes(n.id)))) return
  salva({ ...dati, notifiche: dati.notifiche.map((n) => (!ids || ids.includes(n.id) ? { ...n, letta: true } : n)) })
}

/** Codice di ritiro leggibile al telefono: niente 0/O, 1/I. */
function codiceRitiro(): string {
  const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const v = new Uint32Array(6)
  crypto.getRandomValues(v)
  const s = [...v].map((n) => a[n % a.length]).join('')
  return `RIT-${s.slice(0, 4)}-${s.slice(4)}`
}

export function prenota(p: Omit<Prenotazione, 'codice' | 'creata'>): Prenotazione {
  const lotto = lottoPerCodice(p.lottoCodice)!
  const nuova = { ...p, codice: codiceRitiro(), creata: ora() }
  const residuo = Math.max(0, +(lotto.quantita - p.quantita).toFixed(2))
  salva({ ...dati, prenotazioni: [nuova, ...dati.prenotazioni], residui: { ...dati.residui, [p.lottoId]: residuo } })
  return nuova
}

/** Annulla una prenotazione: la quantità torna al lotto. */
export function annullaPrenotazione(codice: string) {
  const p = dati.prenotazioni.find((x) => x.codice === codice)
  if (!p) return
  const attuale = dati.residui[p.lottoId]
  const residui = { ...dati.residui }
  if (attuale !== undefined) residui[p.lottoId] = +(attuale + p.quantita).toFixed(2)
  salva({ ...dati, prenotazioni: dati.prenotazioni.filter((x) => x.codice !== codice), residui })
}

/** Riporta la demo allo stato iniziale. */
export function azzeraDemo() {
  salva(VUOTO)
}
