// Città fuori dalla zona demo: lotti e aziende fittizi generati al momento, con lo stesso
// generatore di Senigallia (src/data/genera.ts) e un seed ricavato dal nome del comune.
// Stessa città = stessi lotti, ogni volta e su ogni browser: i link diretti funzionano.
// Tutti i nomi sono INVENTATI: mestiere + parole generiche, mai cognomi né il nome del comune.

import { comuni } from '../data'
import { fotoAdatte, type FotoKey } from '../data/catalogo'
import {
  ASSORTIMENTO_BASE, COMBO, DATA_RIFERIMENTO, FINITURE, GREZZO, IDRAULICA, LEGNO, PESO_TIPO, PESO_VOCE, POSA, TUTTO, VIE, ZOOM,
  materiale, round, testi, voceDi,
} from '../data/genera'
import type { Azienda, Comune, Luogo, Lotto, TipoAzienda } from '../data/types'
import { registraZona } from './archivio'
import { fotoDellaVoce } from './foto'
import { distanzaKm } from './geo'
import { normalizza } from './parser'
import { createRng, type Rng } from './rng'

/** Entro questa distanza da uno dei 7 comuni della demo si usano i dati di sempre. */
export const RAGGIO_ZONA_DEMO_KM = 20

/** Il luogo sta nella zona demo (Corinaldo, Marotta…)? */
export const inZonaDemo = (l: Luogo) =>
  !!l.frazione || comuni.some((c) => distanzaKm(c.lat, c.lng, l.lat, l.lng) <= RAGGIO_ZONA_DEMO_KM)

const chiaveDi = (l: Luogo) => `${l.provincia}-${l.sigla}`

/** Il luogo come punto di riferimento della ricerca; `zona` c'è solo per le città generate. */
export function riferimentoDi(l: Luogo): Comune {
  const generata = !inZonaDemo(l)
  return {
    id: l.frazione ? `fr-${normalizza(l.nome).replace(/ /g, '-')}` : chiaveDi(l),
    nome: l.nome,
    sigla: l.sigla ?? '',
    lat: l.lat,
    lng: l.lng,
    raggioKm: 2,
    zona: generata ? chiaveDi(l) : undefined,
  }
}

/** "AV-TO-TOR-0412" → provincia e sigla del comune; null per i codici della zona demo. */
export function comuneDaCodice(codice: string): { provincia: string; sigla: string } | null {
  const m = codice.match(/^AV-([A-Z]{2})-([A-Z]{3})-\d{4}$/)
  return m ? { provincia: m[1], sigla: m[2] } : null
}

export const luogoDaCodice = (codice: string, luoghi: Luogo[]) => {
  const c = comuneDaCodice(codice)
  return c ? luoghi.find((l) => l.provincia === c.provincia && l.sigla === c.sigla) : undefined
}

// ── nomi delle aziende ─────────────────────────────────────────────────────

const MESTIERI: Record<string, string[]> = {
  impresa: ['Costruzioni', 'Impresa Edile', 'Edilizia', 'Cantieri'],
  rivendita: ['Rivendita Edile', 'Materiali Edili', 'Deposito Edile', 'Magazzino Edile'],
  showroom: ['Ceramiche', 'Bagni & Superfici', 'Arredobagno', 'Superfici'],
  idraulica: ['Idraulica', 'Termoidraulica'],
  legno: ['Serramenti', 'Falegnameria'],
  posa: ['Posa Pavimenti', 'Posa & Finiture'],
}
// parole generiche o inventate: niente cognomi, niente luoghi
const PAROLE = [
  'Tre Querce', 'Quattro Venti', 'Tramontana', 'Maestrale', 'Grecale', 'Libeccio', 'Cantiere Aperto', 'Filo a Piombo',
  'Buona Posa', 'Calce Viva', 'Fornace Nuova', 'Squadra e Livella', 'Terra e Sole', 'Muro Maestro', "Cazzuola d'Oro",
  'Cotto Vivo', 'Punto Fermo', 'Murabella',
]

// ── generazione ────────────────────────────────────────────────────────────

/** FNV-1a a 32 bit: dal nome del comune al seed. */
function hash(s: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

// raggio massimo delle sedi (km) per fascia di popolazione
const RAGGIO_KM = [1.2, 1.6, 2, 2.5, 3, 3.5, 4.5, 5]

interface Zona {
  chiave: string
  riferimento: Comune
  aziende: Azienda[]
  lotti: Lotto[]
}
const generate = new Map<string, Zona>()

/** Genera (una volta sola) la zona di un comune fuori dalla zona demo e la registra nell'archivio. */
export function assicuraZona(l: Luogo): Zona {
  const chiave = chiaveDi(l)
  let z = generate.get(chiave)
  if (!z) {
    z = genera(l)
    generate.set(chiave, z)
    registraZona(chiave, z.aziende, z.lotti)
  }
  return z
}

/** Il riferimento di una zona già generata (per la scheda di un lotto: distanze dal suo comune). */
export const riferimentoZona = (chiave: string): Comune | undefined => generate.get(chiave)?.riferimento

function genera(l: Luogo): Zona {
  const chiave = chiaveDi(l)
  const rng = createRng(hash(`${normalizza(l.nome)}|${l.provincia}`))
  const riferimento = riferimentoDi(l)

  // aziende: almeno una per tipo, poi a caso
  const nAziende = 5 + Math.min(7, l.fascia + 1)
  const tipi: TipoAzienda[] = ['rivendita', 'impresa', 'showroom', 'artigiano']
  while (tipi.length < nAziende) tipi.push(rng.weighted(['rivendita', 'impresa', 'showroom', 'artigiano'] as TipoAzienda[], [2, 3, 2, 3]))
  const parole = rng.shuffle(PAROLE)
  const specialita = new Map<string, FotoKey[]>()
  const aziende: Azienda[] = tipi.map((tipo, i) => {
    const [spec, mestieri] = specialitaDi(tipo, rng)
    const id = `G-${chiave}-A${String(i + 1).padStart(2, '0')}`
    specialita.set(id, spec)
    const [lat, lng] = posizione(l, rng)
    return {
      id,
      nome: `${rng.pick(mestieri)} ${parole[i]}`,
      tipo,
      comune: chiave,
      comuneNome: l.nome,
      indirizzo: `${rng.pick(VIE)} ${rng.int(2, 88)}, ${l.nome}`,
      telefono: `000 000 ${String(rng.int(0, 9999)).padStart(4, '0')}`,
      lat,
      lng,
    }
  })

  // lotti: l'assortimento base (c'è sempre del gres 60x60 grigio), almeno un lotto per ogni voce del catalogo
  // (2 sopra i 100.000 abitanti, 3 sopra i 300.000), poi altri a caso
  const perVoce = l.fascia >= 6 ? 3 : l.fascia >= 5 ? 2 : 1
  const copertura = TUTTO.flatMap((voce) => Array.from({ length: perVoce }, () => ({ voce })))
  const nLotti = Math.max(20 + l.fascia * 4, ASSORTIMENTO_BASE.length + copertura.length + 4)
  const piano = rng.shuffle([
    ...ASSORTIMENTO_BASE,
    ...copertura,
    ...Array.from({ length: nLotti - ASSORTIMENTO_BASE.length - copertura.length }, () => ({
      voce: rng.weighted(TUTTO, TUTTO.map((k) => PESO_VOCE[k] ?? 1)),
    })),
  ] as { voce: FotoKey; formato?: string }[])
  const carico = new Map(aziende.map((a) => [a.id, 0]))
  const codici = new Set<string>()
  const usoFoto = new Map<string, number>()

  const lotti: Lotto[] = piano.map(({ voce: k, formato: formatoVoluto }) => {
    const voce = voceDi(k)
    const m = materiale(rng, voce, formatoVoluto)
    const candidate = aziende.filter((a) => specialita.get(a.id)!.includes(k))
    const azienda = rng.weighted(candidate, candidate.map((a) => PESO_TIPO[a.tipo] / (1 + carico.get(a.id)!) ** 3))
    carico.set(azienda.id, carico.get(azienda.id)! + 1)
    let codice: string
    do codice = `AV-${chiave}-${String(rng.int(1, 9999)).padStart(4, '0')}`
    while (codici.has(codice))
    codici.add(codice)
    const data = new Date(DATA_RIFERIMENTO - rng.int(0, 60) * 86_400_000).toISOString().slice(0, 10)
    const t = testi(rng, voce, m)
    const files = fotoAdatte(voce, fotoDellaVoce(k), m.formato.f, m.colore)
    const chiaveFoto = files.join()
    const n = usoFoto.get(chiaveFoto) ?? 0
    usoFoto.set(chiaveFoto, n + 1)
    return {
      id: '',
      codice,
      categoria: voce.categoria,
      titolo: t.titolo,
      descrizione: t.descrizione,
      formato: m.formato.f,
      colore: m.colore,
      quantita: m.quantita,
      unita: m.opz.unita,
      pesoKg: m.pesoKg,
      prezzo: m.prezzo,
      prezzoListino: m.prezzoListino,
      foto: files.length ? files[n % files.length] : `/lotti/${k}.webp`,
      fotoAlt: voce.alt,
      fotoVar: { ...rng.pick(COMBO), zoom: rng.pick(ZOOM) },
      aziendaId: azienda.id,
      data,
      stato: 'disponibile' as const,
    }
  })
  // dal più recente, come nella zona demo; id stabili
  lotti.sort((a, b) => b.data.localeCompare(a.data))
  lotti.forEach((x, i) => (x.id = `G-${chiave}-L${String(i + 1).padStart(2, '0')}`))
  return { chiave, riferimento, aziende, lotti }
}

function specialitaDi(tipo: TipoAzienda, rng: Rng): [FotoKey[], string[]] {
  if (tipo === 'rivendita') return [TUTTO, MESTIERI.rivendita]
  if (tipo === 'impresa') return [GREZZO, MESTIERI.impresa]
  if (tipo === 'showroom') return [FINITURE, MESTIERI.showroom]
  const s = rng.pick(['idraulica', 'legno', 'posa'] as const)
  return [s === 'idraulica' ? IDRAULICA : s === 'legno' ? LEGNO : POSA, MESTIERI[s]]
}

/**
 * Sede. Con acqua vicino (mare, laguna, lago): a meno di 250 m da una località abitata vicina,
 * che sta a terra. Altrimenti su un arco di 120° verso l'entroterra.
 */
function posizione(l: Luogo, rng: Rng): [number, number] {
  let [lat0, lng0] = [l.lat, l.lng]
  let gradi: number
  let km: number
  if (l.appigli?.length) {
    // non il centro del comune: il punto GeoNames delle città di mare è spesso sul porto
    ;[lat0, lng0] = rng.pick(l.appigli)
    gradi = rng.range(0, 360)
    km = rng.range(0.05, 0.25)
  } else {
    gradi = l.entroterra === null ? rng.range(0, 360) : l.entroterra + rng.range(-60, 60)
    km = rng.range(0.4, RAGGIO_KM[Math.min(l.fascia, RAGGIO_KM.length - 1)])
  }
  const a = (gradi * Math.PI) / 180
  const lat = lat0 + (km * Math.sin(a)) / 110.574
  const lng = lng0 + (km * Math.cos(a)) / (111.32 * Math.cos((lat0 * Math.PI) / 180))
  return [round(lat, 5), round(lng, 5)]
}
