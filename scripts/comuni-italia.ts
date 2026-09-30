// Genera src/data/comuni-italia.txt dai dati GeoNames (geonames.org, licenza CC BY 4.0).
// Uso: npm run comuni   (serve la rete: scarica IT.zip in una cartella temporanea e poi la cancella)
//      GEONAMES_DIR=cartella npm run comuni   (usa un IT.txt già estratto, senza scaricare)
//
// Formato, una riga per luogo, campi separati da "|":
//   comuni:   nome|lat|lng|provincia|sigla|popolazione|entroterra[|appigli]
//   frazioni: nome|lat|lng            (dopo la riga "#frazioni": località della zona demo)
// - nome: "Bolzano/Bozen" = più nomi validi; il primo è quello mostrato
// - sigla: 3 lettere, unica nella provincia (per i codici lotto AV-TO-TOR-0412)
// - popolazione: fascia 0–7
// - entroterra: direzione verso le località abitate vicine, in decine di gradi (0 = est, 9 = nord);
//   "-" se intorno non ce ne sono. Il mare non ha località: sulla costa la freccia punta verso terra.
// - appigli: solo per i comuni con acqua vicino, località abitate a cui agganciare le sedi (vedi appigli())

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { inflateRawSync } from 'node:zlib'

const URL_DUMP = 'https://download.geonames.org/export/dump/IT.zip'
const OUT = 'src/data/comuni-italia.txt'
const SENIGALLIA = { lat: 43.7155, lng: 13.2175 }
const RAGGIO_FRAZIONI_KM = 35
const RAGGIO_ENTROTERRA_KM = 10

// Nomi ufficiali lunghi → anche il nome d'uso
// Correzioni scritte a mano per i capoluoghi di regione e le città sull'acqua (Ancona è nella zona demo).
// centro = centro storico (il punto GeoNames è a volte lontano, per Torino ~2,5 km).
// entroterra: gradi (0 = est, 90 = nord), null = sedi tutto intorno.
// appigli: punti a terra a cui agganciare le sedi, per le città con mare, laguna o porto vicino al centro.
type Correzione = { lat: number; lng: number; entroterra?: number | null; appigli?: [number, number][] }
const CORREZIONI: Record<string, Correzione> = {
  "L'Aquila|AQ": { lat: 42.3504, lng: 13.3995, entroterra: null },
  'Potenza|PZ': { lat: 40.6395, lng: 15.805, entroterra: null },
  'Catanzaro|CZ': { lat: 38.91, lng: 16.5877, entroterra: null },
  'Napoli|NA': { lat: 40.848, lng: 14.256, appigli: [[40.8448, 14.233], [40.858, 14.249], [40.86, 14.275], [40.849, 14.257]] }, // Vomero, Stella, Poggioreale, Decumani
  'Bologna|BO': { lat: 44.4938, lng: 11.3426, entroterra: null },
  'Trieste|TS': { lat: 45.6503, lng: 13.7676, appigli: [[45.6475, 13.7805], [45.6395, 13.783], [45.6625, 13.781], [45.656, 13.796]] }, // Barriera, San Giacomo, Roiano, San Giovanni
  'Roma|RM': { lat: 41.896, lng: 12.482, entroterra: null },
  'Genova|GE': { lat: 44.4075, lng: 8.934, appigli: [[44.417, 8.933], [44.412, 8.956], [44.418, 8.948], [44.407, 8.947]] }, // Castelletto, San Fruttuoso, Marassi, Brignole
  'Milano|MI': { lat: 45.4642, lng: 9.19, entroterra: null },
  'Campobasso|CB': { lat: 41.5603, lng: 14.6627, entroterra: null },
  'Torino|TO': { lat: 45.0703, lng: 7.6869, entroterra: null },
  'Bari|BA': { lat: 41.126, lng: 16.869, appigli: [[41.118, 16.858], [41.11, 16.872], [41.106, 16.882], [41.108, 16.86]] }, // Libertà, Carrassi, San Pasquale, Picone
  'Cagliari|CA': { lat: 39.217, lng: 9.113, appigli: [[39.233, 9.105], [39.2255, 9.123], [39.2185, 9.12], [39.233, 9.123]] }, // Is Mirrionis, San Benedetto, Villanova, Genneruxi
  'Palermo|PA': { lat: 38.1157, lng: 13.3615, appigli: [[38.127, 13.352], [38.117, 13.343], [38.106, 13.359], [38.123, 13.338]] }, // Libertà, Zisa, Oreto, Noce
  'Firenze|FI': { lat: 43.7731, lng: 11.256, entroterra: null },
  'Trento|TN': { lat: 46.067, lng: 11.1216, entroterra: null },
  'Perugia|PG': { lat: 43.1122, lng: 12.3888, entroterra: null },
  'Aosta|AO': { lat: 45.7372, lng: 7.3206, entroterra: null },
  // Venezia: centro a San Marco, sedi solo in terraferma (Mestre, Marghera, Carpenedo, Chirignago)
  'Venezia|VE': { lat: 45.4343, lng: 12.3388, appigli: [[45.4907, 12.2425], [45.4745, 12.226], [45.5, 12.256], [45.48, 12.199]] },
  'Taranto|TA': { lat: 40.475, lng: 17.231, appigli: [[40.468, 17.244], [40.456, 17.26], [40.454, 17.274]] }, // Borgo, Tre Carrare, Salinella
  'Pescara|PE': { lat: 42.4645, lng: 14.214, appigli: [[42.4665, 14.208], [42.4545, 14.217], [42.461, 14.196], [42.446, 14.198]] }, // centro, Porta Nuova, Colli, Rancitelli
}

const ALIAS: Record<string, string[]> = {
  "Reggio nell'Emilia": ['Reggio Emilia'],
  'Reggio di Calabria': ['Reggio Calabria'],
  "Forlì": ['Forli'],
}

async function testoDump(): Promise<string> {
  const dir = process.env.GEONAMES_DIR
  if (dir) return readFileSync(join(dir, 'IT.txt'), 'utf8')
  const tmp = mkdtempSync(join(tmpdir(), 'avanzi-geonames-'))
  try {
    console.log(`Scarico ${URL_DUMP}…`)
    const res = await fetch(URL_DUMP)
    if (!res.ok) throw new Error(`Download fallito: ${res.status}`)
    const zip = Buffer.from(await res.arrayBuffer())
    writeFileSync(join(tmp, 'IT.zip'), zip)
    return estraiDaZip(zip, 'IT.txt').toString('utf8')
  } finally {
    rmSync(tmp, { recursive: true, force: true })
  }
}

/** Lettore zip minimo: directory centrale → intestazione locale → deflate. */
function estraiDaZip(zip: Buffer, nome: string): Buffer {
  let eocd = zip.length - 22
  while (eocd >= 0 && zip.readUInt32LE(eocd) !== 0x06054b50) eocd--
  if (eocd < 0) throw new Error('Zip non valido')
  const n = zip.readUInt16LE(eocd + 10)
  let p = zip.readUInt32LE(eocd + 16)
  for (let i = 0; i < n; i++) {
    const metodo = zip.readUInt16LE(p + 10)
    const compressi = zip.readUInt32LE(p + 20)
    const lnome = zip.readUInt16LE(p + 28)
    const lextra = zip.readUInt16LE(p + 30)
    const lcommento = zip.readUInt16LE(p + 32)
    const locale = zip.readUInt32LE(p + 42)
    const file = zip.toString('utf8', p + 46, p + 46 + lnome)
    if (file === nome) {
      const inizio = locale + 30 + zip.readUInt16LE(locale + 26) + zip.readUInt16LE(locale + 28)
      const dati = zip.subarray(inizio, inizio + compressi)
      return metodo === 0 ? dati : inflateRawSync(dati)
    }
    p += 46 + lnome + lextra + lcommento
  }
  throw new Error(`${nome} non trovato nello zip`)
}

function km(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const r = Math.PI / 180
  const x = Math.sin(((b.lat - a.lat) * r) / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(((b.lng - a.lng) * r) / 2) ** 2
  return 2 * 6371 * Math.asin(Math.sqrt(x))
}

const lettere = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z]/g, '')

/** Sigle candidate: prime tre lettere, poi prima lettera + due lettere successive in ordine. */
function* sigleCandidate(nome: string) {
  const l = lettere(nome.split('/')[0])
  yield l.slice(0, 3).padEnd(3, 'X')
  for (let i = 1; i < l.length; i++) for (let j = i + 1; j < l.length; j++) yield l[0] + l[i] + l[j]
  for (let k = 0; k < 26 * 26; k++) yield l[0] + String.fromCharCode(65 + Math.floor(k / 26)) + String.fromCharCode(65 + (k % 26))
}

const fascia = (pop: number) => [1000, 3000, 10000, 30000, 100000, 300000, 1000000].filter((s) => pop >= s).length

interface Riga { nome: string; lat: number; lng: number; prov: string; pop: number; classe: string; codice: string }

const righe: Riga[] = (await testoDump())
  .split('\n')
  .map((r) => r.split('\t'))
  .filter((c) => c.length > 14)
  .map((c) => ({ nome: c[1], lat: Number(c[4]), lng: Number(c[5]), classe: c[6], codice: c[7], prov: c[11], pop: Number(c[14]) || 0 }))

const comuni = righe.filter((r) => r.codice === 'ADM3')
// località abitate oggi (niente abbandonate, storiche o distrutte)
const abitati = righe.filter((r) => r.classe === 'P' && !['PPLQ', 'PPLH', 'PPLW', 'PPLCH'].includes(r.codice))

// griglia di 0,1° per trovare in fretta le località vicine
const griglia = new Map<string, Riga[]>()
const cella = (lat: number, lng: number) => `${Math.floor(lat * 10)},${Math.floor(lng * 10)}`
for (const a of abitati) {
  const k = cella(a.lat, a.lng)
  if (!griglia.has(k)) griglia.set(k, [])
  griglia.get(k)!.push(a)
}

/** Località abitate tra 0,8 e 10 km, con la direzione in gradi (0 = est). */
function vicine(c: Riga) {
  const out: { a: Riga; d: number; gradi: number }[] = []
  for (let i = -1; i <= 1; i++) for (let j = -2; j <= 2; j++) {
    for (const a of griglia.get(`${Math.floor(c.lat * 10) + i},${Math.floor(c.lng * 10) + j}`) ?? []) {
      const d = km(c, a)
      if (d < 0.8 || d > RAGGIO_ENTROTERRA_KM) continue
      const dx = (a.lng - c.lng) * Math.cos((c.lat * Math.PI) / 180)
      out.push({ a, d, gradi: ((Math.atan2(a.lat - c.lat, dx) * 180) / Math.PI + 360) % 360 })
    }
  }
  return out
}

function entroterra(c: Riga): string {
  const v = vicine(c)
  if (v.length < 3) return '-'
  let x = 0, y = 0
  for (const { gradi } of v) {
    x += Math.cos((gradi * Math.PI) / 180)
    y += Math.sin((gradi * Math.PI) / 180)
  }
  return String(Math.round(((Math.atan2(y, x) * 180) / Math.PI + 360) % 360 / 10) % 36)
}

/**
 * Comuni con acqua vicino (mare, laguna, lago): c'è un settore di 90° senza località abitate.
 * Per loro, fino a 3 località vicine in direzioni diverse, come punti a terra da cui far nascere le sedi.
 * Formato: "dlat:dlng" in millesimi di grado rispetto al comune, separati da ",".
 */
function appigli(c: Riga): string {
  const v = vicine(c).filter((x) => x.d <= 4)
  const settori = new Array(36).fill(0)
  for (const x of vicine(c)) settori[Math.floor(x.gradi / 10) % 36]++
  const acqua = settori.some((_, k) => [0, 1, 2, 3, 4, 5, 6, 7, 8].every((h) => settori[(k + h) % 36] === 0))
  if (!acqua || v.length === 0) return ''
  const perSettore = new Map<number, (typeof v)[number]>()
  for (const x of v.sort((a, b) => a.d - b.d)) {
    const s = Math.floor(x.gradi / 30)
    if (!perSettore.has(s)) perSettore.set(s, x)
  }
  return [...perSettore.values()]
    .sort((a, b) => a.d - b.d)
    .slice(0, 3)
    .map(({ a }) => `${Math.round((a.lat - c.lat) * 1000)}:${Math.round((a.lng - c.lng) * 1000)}`)
    .join(',')
}

// sigle: nella provincia, dal comune più popoloso
const sigle = new Map<Riga, string>()
const perProvincia = new Map<string, Riga[]>()
for (const c of comuni) {
  if (!perProvincia.has(c.prov)) perProvincia.set(c.prov, [])
  perProvincia.get(c.prov)!.push(c)
}
for (const lista of perProvincia.values()) {
  const usate = new Set<string>()
  for (const c of [...lista].sort((a, b) => b.pop - a.pop || a.nome.localeCompare(b.nome))) {
    for (const s of sigleCandidate(c.nome)) {
      if (!usate.has(s)) {
        usate.add(s)
        sigle.set(c, s)
        break
      }
    }
  }
}

const usate = new Set<string>()
const f3 = (v: number) => v.toFixed(3).replace(/\.?0+$/, '')
const righeComuni = comuni
  // omonimi: prima il più popoloso (è quello scelto se non si scrive la provincia)
  .sort((a, b) => a.nome.localeCompare(b.nome, 'it') || b.pop - a.pop)
  .map((c) => {
    const nomi = [c.nome, ...(ALIAS[c.nome] ?? [])].join('/')
    const k = `${c.nome}|${c.prov}`
    const corr = CORREZIONI[k]
    let dir: string, ap: string
    if (corr) {
      usate.add(k)
      c.lat = corr.lat
      c.lng = corr.lng
      dir = corr.entroterra === undefined ? entroterra(c) : corr.entroterra === null ? '-' : String(Math.round(corr.entroterra / 10) % 36)
      ap = (corr.appigli ?? []).map(([lat, lng]) => `${Math.round((lat - c.lat) * 1000)}:${Math.round((lng - c.lng) * 1000)}`).join(',')
    } else {
      dir = entroterra(c)
      ap = appigli(c)
    }
    return `${nomi}|${f3(c.lat)}|${f3(c.lng)}|${c.prov}|${sigle.get(c)}|${fascia(c.pop)}|${dir}${ap ? `|${ap}` : ''}`
  })
const mancanti = Object.keys(CORREZIONI).filter((k) => !usate.has(k))
if (mancanti.length) throw new Error(`Correzioni senza comune: ${mancanti.join(', ')}`)

// frazioni della zona demo: località abitate vicino a Senigallia che non sono comuni
const nomiComuni = new Set(comuni.flatMap((c) => c.nome.toLowerCase().split('/')))
const frazioni = new Map<string, Riga>()
for (const a of abitati) {
  // solo frazioni e borghi veri: niente casolari ("Casa Vici"), numeri romani, nomi in inglese o minuscoli
  if (!['PPL', 'PPLL', 'PPLX'].includes(a.codice)) continue
  if (/\d|\b[IVX]+$|\bof\b|\.|^(Casa|Case|Podere|Molino|Mulino|Convento|Chiesa|Comunità|Contrada|Monache|Fornace|Bivio|Forte|Direttissima)\b/.test(a.nome)) continue
  if (!/^[A-ZÀ-Ý]/.test(a.nome)) continue
  if (nomiComuni.has(a.nome.toLowerCase())) continue
  if (km(a, SENIGALLIA) > RAGGIO_FRAZIONI_KM) continue
  const gia = frazioni.get(a.nome)
  if (!gia || km(a, SENIGALLIA) < km(gia, SENIGALLIA)) frazioni.set(a.nome, a)
}
// quartieri della zona demo che GeoNames non ha (coordinate approssimate, bastano per le distanze)
for (const [nome, lat, lng] of [['Cesano', 43.744, 13.171], ['Torrette', 43.603, 13.455]] as const) {
  if (!frazioni.has(nome)) frazioni.set(nome, { nome, lat, lng, prov: '', pop: 0, classe: 'P', codice: 'PPL' })
}
const righeFrazioni = [...frazioni.values()].sort((a, b) => a.nome.localeCompare(b.nome, 'it')).map((a) => `${a.nome}|${f3(a.lat)}|${f3(a.lng)}`)

writeFileSync(OUT, [...righeComuni, '#frazioni', ...righeFrazioni].join('\n') + '\n')
const byte = readFileSync(OUT).length
console.log(`${OUT}: ${righeComuni.length} comuni, ${righeFrazioni.length} frazioni, ${(byte / 1024).toFixed(0)} KB`)
