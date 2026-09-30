// Genera i dati fittizi della demo in src/data/*.json.
// Uso: npm run data   (seed fisso: rilanciando, l'output non cambia)
//
// Tutti i nomi di aziende, persone e indirizzi sono INVENTATI.

import { readdirSync, writeFileSync } from 'node:fs'
import type {
  Azienda, Comune, ComuneId, FotoVar, Lotto, PuntoDecorativo, TipoAzienda,
} from '../src/data/types.ts'
import { distanzaCostaKm, isInMare, verificaCosta } from './costa.ts'
import { CITTA, isInItalia } from './italia.ts'
import { createRng } from '../src/lib/rng.ts'
import { fotoAdatte, type FotoKey } from '../src/data/catalogo.ts'
import {
  ASSORTIMENTO_BASE, COMBO, FINITURE, GREZZO, IDRAULICA, LEGNO, PESO_TIPO, PESO_VOCE, POSA, TUTTO, VIE, ZOOM,
  DATA_RIFERIMENTO, materiale, round, testi, voceDi,
} from '../src/data/genera.ts'

const SEED = 20260928
const OGGI = DATA_RIFERIMENTO
const OUT = 'src/data'

const rng = createRng(SEED)
verificaCosta()

// ─── Comuni ────────────────────────────────────────────────────────────────

const COMUNI: Comune[] = [
  { id: 'senigallia', nome: 'Senigallia', sigla: 'SEN', lat: 43.7155, lng: 13.2175, raggioKm: 2.5 },
  { id: 'jesi', nome: 'Jesi', sigla: 'JES', lat: 43.5225, lng: 13.2437, raggioKm: 2.5 },
  { id: 'ancona', nome: 'Ancona', sigla: 'ANC', lat: 43.6072, lng: 13.5046, raggioKm: 3 },
  { id: 'fano', nome: 'Fano', sigla: 'FAN', lat: 43.8395, lng: 13.0135, raggioKm: 2.5 },
  { id: 'osimo', nome: 'Osimo', sigla: 'OSI', lat: 43.4856, lng: 13.4817, raggioKm: 2 },
  { id: 'pesaro', nome: 'Pesaro', sigla: 'PES', lat: 43.9058, lng: 12.9071, raggioKm: 3 },
  { id: 'fabriano', nome: 'Fabriano', sigla: 'FAB', lat: 43.3363, lng: 12.9043, raggioKm: 2 },
]
const comune = (id: ComuneId) => COMUNI.find((c) => c.id === id)!

const PREFISSO: Record<ComuneId, string> = {
  ancona: '071', senigallia: '071', jesi: '0731', osimo: '071', pesaro: '0721', fano: '0721', fabriano: '0732',
}

// ─── Aziende (inventate) ──────────────────────────────────────────────────────

const AZIENDE_BASE: [string, TipoAzienda, ComuneId, FotoKey[]][] = [
  ['Costruzioni Colle Guasco', 'impresa', 'ancona', GREZZO],
  ['Rivendita Edile Baraccola', 'rivendita', 'ancona', TUTTO],
  ['Bagni & Superfici Passetto', 'showroom', 'ancona', FINITURE],
  ['Posa Pavimenti Brecce Bianche', 'artigiano', 'ancona', POSA],
  ['Restauri Edili Capodimonte', 'impresa', 'ancona', [...GREZZO, 'pietra', 'porte']],
  ['Magazzino Edile Palombare', 'rivendita', 'ancona', TUTTO],
  ['Impresa Edile Cesano', 'impresa', 'senigallia', GREZZO],
  ['Materiali Edili Borgo Bicchia', 'rivendita', 'senigallia', TUTTO],
  ['Casa Rotonda Arredobagno', 'showroom', 'senigallia', FINITURE],
  ['Idraulica Ciarnin', 'artigiano', 'senigallia', IDRAULICA],
  ['Costruzioni Marzocca', 'impresa', 'senigallia', [...GREZZO, 'gres-legno']],
  ['Edil Foglia Costruzioni', 'impresa', 'pesaro', GREZZO],
  ['Ardizio Edilizia', 'rivendita', 'pesaro', TUTTO],
  ['Superfici San Bartolo', 'showroom', 'pesaro', FINITURE],
  ['Falegnameria Villa Fastiggi', 'artigiano', 'pesaro', LEGNO],
  ['Termoidraulica Baia Flaminia', 'artigiano', 'pesaro', IDRAULICA],
  ['Costruzioni Poderino', 'impresa', 'fano', GREZZO],
  ['Rivendita Edile Arzilla', 'rivendita', 'fano', TUTTO],
  ['Ceramiche Porta Maggiore', 'showroom', 'fano', FINITURE],
  ['Serramenti Sassonia', 'artigiano', 'fano', LEGNO],
  ['Impresa Edile Minonna', 'impresa', 'jesi', GREZZO],
  ['Vallesina Materiali', 'rivendita', 'jesi', TUTTO],
  ['Bagno & Pietra Esino', 'showroom', 'jesi', FINITURE],
  ['Pavimenti Ponte Pio', 'artigiano', 'jesi', POSA],
  ['Costruzioni Campocavallo', 'impresa', 'osimo', GREZZO],
  ['Deposito Edile Aspio', 'rivendita', 'osimo', TUTTO],
  ['Serramenti San Biagio', 'artigiano', 'osimo', LEGNO],
  ['Impresa Edile Giano', 'impresa', 'fabriano', GREZZO],
  ['Appennino Materiali', 'rivendita', 'fabriano', TUTTO],
  ['Posa Pietra Valleremita', 'artigiano', 'fabriano', POSA],
]

function posizioneAzienda(c: Comune): [number, number] {
  for (let tentativi = 0; tentativi < 500; tentativi++) {
    const distKm = Math.min(3, Math.abs(rng.gaussian(0, c.raggioKm * 0.6)))
    const angolo = rng.range(0, 2 * Math.PI)
    const lat = c.lat + (distKm * Math.sin(angolo)) / 110.57
    const lng = c.lng + (distKm * Math.cos(angolo)) / (111.32 * Math.cos((c.lat * Math.PI) / 180))
    // lato mare escluso + 400 m di margine dalla costa approssimata
    if (isInMare(lat, lng) || distanzaCostaKm(lat, lng) < 0.4) continue
    return [round(lat, 5), round(lng, 5)]
  }
  throw new Error(`Nessuna posizione valida per ${c.nome}`)
}

const aziende: Azienda[] = AZIENDE_BASE.map(([nome, tipo, comuneId], i) => {
  const [lat, lng] = posizioneAzienda(comune(comuneId))
  return {
    id: `A${String(i + 1).padStart(2, '0')}`,
    nome,
    tipo,
    comune: comuneId,
    indirizzo: `${rng.pick(VIE)} ${rng.int(2, 88)}, ${comune(comuneId).nome}`,
    telefono: `${PREFISSO[comuneId]} 000 ${String(rng.int(0, 9999)).padStart(4, '0')}`,
    lat,
    lng,
  }
})

// ─── Lotti ───────────────────────────────────────────────────────────────────

const N_LOTTI = 180

// 1. Assortimento base in OGNI comune: il materiale comune si trova vicino a tutti.
//    Il 60x60 è il formato di gres più diffuso: due lotti grigi 60x60 per comune.
interface Piano {
  voce: FotoKey
  comune?: ComuneId
  formato?: string
}
const pianoBase: Piano[] = COMUNI.flatMap((c) => ASSORTIMENTO_BASE.map((p) => ({ ...p, comune: c.id })))

// 2. Il resto a caso, con più peso ai materiali comuni.
const pianoCasuale: Piano[] = Array.from({ length: N_LOTTI - pianoBase.length }, () => ({
  voce: rng.weighted(TUTTO, TUTTO.map((k) => PESO_VOCE[k] ?? 1)),
}))
const piano = rng.shuffle([...pianoBase, ...pianoCasuale])

const carico = new Map<string, number>(aziende.map((a) => [a.id, 0]))
const codiciUsati = new Set<string>()
const specialita = new Map(AZIENDE_BASE.map(([, , , s], i) => [aziende[i].id, s]))

const lottiGrezzi = piano.map(({ voce: fotoKey, comune: comuneVoluto, formato: formatoVoluto }) => {
  const voce = voceDi(fotoKey)
  const m = materiale(rng, voce, formatoVoluto)

  // azienda: tra quelle che trattano quel materiale, preferendo le meno cariche
  const candidate = aziende.filter((a) => specialita.get(a.id)!.includes(fotoKey) && (!comuneVoluto || a.comune === comuneVoluto))
  const azienda = rng.weighted(candidate, candidate.map((a) => PESO_TIPO[a.tipo] / (1 + carico.get(a.id)!) ** 3))
  carico.set(azienda.id, carico.get(azienda.id)! + 1)

  let codice: string
  do codice = `AV-${comune(azienda.comune).sigla}-${String(rng.int(1, 9999)).padStart(4, '0')}`
  while (codiciUsati.has(codice))
  codiciUsati.add(codice)

  const giorniFa = rng.int(0, 60)
  const data = new Date(OGGI - giorniFa * 86_400_000).toISOString().slice(0, 10)

  const t = testi(rng, voce, m)
  return {
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
    voce: fotoKey,
    fotoAlt: voce.alt,
    aziendaId: azienda.id,
    data,
    stato: 'disponibile' as const,
  }
})

// ─── Foto: assegnate per prefisso, con un RNG separato ─────────────────────────
// Ogni file in public/lotti appartiene alla voce con il prefisso più lungo:
// gres-grigio.webp, gres-grigio-2.webp, gres-grigio-magazzino.webp → voce "gres-grigio".
// Aggiungere foto cambia solo foto e fotoVar, non codici, quantità o prezzi.

const rngFoto = createRng(SEED + 1)
const FILE_FOTO = readdirSync('public/lotti').filter((f) => f.endsWith('.webp')).sort()
const VOCI_PER_LUNGHEZZA = [...TUTTO].sort((a, b) => b.length - a.length)
const fotoPerVoce = new Map<FotoKey, string[]>(TUTTO.map((k) => [k, []]))
for (const file of FILE_FOTO) {
  const base = file.slice(0, -'.webp'.length)
  const voce = VOCI_PER_LUNGHEZZA.find((k) => base === k || base.startsWith(k + '-'))
  if (voce) fotoPerVoce.get(voce)!.push(file)
  else console.warn(`Foto senza voce di catalogo, ignorata: ${file}`)
}
for (const [voce, files] of fotoPerVoce) {
  if (files.length === 0) throw new Error(`Nessuna foto per la voce ${voce}`)
}

const comboPerFile = new Map(FILE_FOTO.map((f) => [f, rngFoto.shuffle(COMBO)]))
const usoPerVoce = new Map<string, number>()

const lottiConFoto = lottiGrezzi.map(({ voce, ...resto }) => {
  // solo le foto coerenti con formato e colore (vedi fotoSe nel catalogo); tra queste si alternano
  const files = fotoAdatte(voceDi(voce), fotoPerVoce.get(voce)!, resto.formato, resto.colore)
  const chiave = `${voce}|${files.join()}`
  const n = usoPerVoce.get(chiave) ?? 0
  usoPerVoce.set(chiave, n + 1)
  const file = files[n % files.length]
  const combo = comboPerFile.get(file)!.pop() ?? rngFoto.pick(COMBO)
  const fotoVar: FotoVar = { ...combo, zoom: rngFoto.pick(ZOOM) }
  return { ...resto, foto: `/lotti/${file}`, fotoVar }
})

// Ordinati dal più recente, id stabili L001…L090 (ordine dei campi fisso nel JSON)
const lotti: Lotto[] = lottiConFoto
  .map((l, i) => ({ l, i }))
  .sort((a, b) => b.l.data.localeCompare(a.l.data) || a.i - b.i)
  .map(({ l }, i) => ({
    id: `L${String(i + 1).padStart(3, '0')}`,
    codice: l.codice,
    categoria: l.categoria,
    titolo: l.titolo,
    descrizione: l.descrizione,
    formato: l.formato,
    colore: l.colore,
    quantita: l.quantita,
    unita: l.unita,
    pesoKg: l.pesoKg,
    prezzo: l.prezzo,
    prezzoListino: l.prezzoListino,
    foto: l.foto,
    fotoAlt: l.fotoAlt,
    fotoVar: l.fotoVar,
    aziendaId: l.aziendaId,
    data: l.data,
    stato: l.stato,
  }))

// ─── Punti decorativi su tutta Italia ────────────────────────────────────────

const N_PUNTI = 400
const punti: PuntoDecorativo[] = []
while (punti.length < N_PUNTI) {
  let lng: number, lat: number
  if (rng.next() < 0.85) {
    const [clng, clat] = rng.weighted(CITTA, CITTA.map((c) => c[2]))
    lng = rng.gaussian(clng, 0.32)
    lat = rng.gaussian(clat, 0.24)
  } else {
    lng = rng.range(6.6, 18.6)
    lat = rng.range(36.6, 47.1)
  }
  if (isInItalia(lng, lat)) punti.push([round(lng, 3), round(lat, 3)])
}

// ─── Scrittura ───────────────────────────────────────────────────────────────

writeJson('comuni.json', COMUNI)
writeJson('aziende.json', aziende)
writeJson('lotti.json', lotti)
// tutte le foto disponibili, anche quelle che nessun lotto della zona demo usa (servono alle città generate)
writeJson('foto.json', FILE_FOTO.map((f) => `/lotti/${f}`))
writeFileSync(`${OUT}/punti-italia.json`, '[\n' + punti.map((p) => `  [${p[0]}, ${p[1]}]`).join(',\n') + '\n]\n')

// Controllo della ricerca vetrina: "gres 60x60 grigio vicino a Senigallia" → almeno 3 esatti entro 15 km
{
  const sen = comune('senigallia')
  const km = (a: Azienda) => {
    const r = Math.PI / 180
    const x = Math.sin(((a.lat - sen.lat) * r) / 2) ** 2 + Math.cos(sen.lat * r) * Math.cos(a.lat * r) * Math.sin(((a.lng - sen.lng) * r) / 2) ** 2
    return 2 * 6371 * Math.asin(Math.sqrt(x))
  }
  const vetrina = lotti.filter((l) => {
    const a = aziende.find((x) => x.id === l.aziendaId)!
    return l.categoria === 'Gres porcellanato' && l.formato === '60x60' && l.colore.includes('grigio') && km(a) <= 15
  })
  if (vetrina.length < 3) throw new Error(`Ricerca vetrina: solo ${vetrina.length} gres 60x60 grigi entro 15 km da Senigallia`)
  console.log(`vetrina: ${vetrina.length} gres 60x60 grigi entro 15 km da Senigallia`)
}

const kgTot = lotti.reduce((s, l) => s + l.pesoKg, 0)
console.log(`comuni ${COMUNI.length} · aziende ${aziende.length} · lotti ${lotti.length} · punti ${punti.length} · kg totali ${kgTot}`)

// ─── util ──────────────────────────────────────────────────────────────────────

function writeJson(nome: string, data: unknown): void {
  writeFileSync(`${OUT}/${nome}`, JSON.stringify(data, null, 2) + '\n')
}
