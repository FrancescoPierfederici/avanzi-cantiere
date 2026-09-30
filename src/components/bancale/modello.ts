// Dal lotto al bancale da disegnare: forma e colore dei pezzi, quanti, dove.
// Niente Three.js qui: solo numeri, in metri. Bancale EUR 1,2 × 0,8 m.
import type { Lotto } from '../../data/types'
import { formatNumero } from '../../lib/format'
import type { TipoTexture } from './texture'

export type Forma = 'lastra' | 'blocco' | 'sacco' | 'tubo' | 'pannello' | 'scatola'

export interface ModelloBancale {
  forma: Forma
  colore: string
  /** texture del materiale (fughe, fori, venature…) */
  texture: TipoTexture
  /** misure del pezzo [x, y, z] in metri */
  pezzo: [number, number, number]
  /** centri dei pezzi */
  posizioni: [number, number, number][]
  /** centri dei bancali (x, z) */
  bancali: [number, number][]
  /** altezza massima della pila, per inquadrare */
  altezza: number
  larghezza: number
  /** "24 lastre · 1 ≈ 1,4 m²": spiega la scala, anche agli screen reader */
  descrizione: string
}

export const BANCALE = { x: 1.2, y: 0.144, z: 0.8 }
const PASSO_BANCALI = 1.4
const MAX_BANCALI = 4
const ALTEZZA_PILA = 1.1

interface Regola {
  forma: Forma
  pezzo: [number, number, number]
  /** unità del lotto rappresentate da un pezzo, al minimo */
  perPezzo: number
  nome: [singolare: string, plurale: string]
}

function regola(l: Lotto): Regola {
  switch (l.categoria) {
    case 'Gres porcellanato':
    case 'Rivestimenti':
      return { forma: 'lastra', pezzo: [0.6, 0.07, 0.6], perPezzo: 1.4, nome: ['pacco di piastrelle', 'pacchi di piastrelle'] }
    case 'Parquet':
      return { forma: 'lastra', pezzo: [1.15, 0.09, 0.19], perPezzo: 1.6, nome: ['pacco di doghe', 'pacchi di doghe'] }
    case 'Pietra naturale':
      return { forma: 'blocco', pezzo: [0.38, 0.22, 0.38], perPezzo: 1, nome: ['cassetta', 'cassette'] }
    case 'Laterizi':
      return { forma: 'blocco', pezzo: [0.38, 0.24, 0.38], perPezzo: 20, nome: ['pacco di mattoni', 'pacchi di mattoni'] }
    case 'Blocchi':
      return { forma: 'blocco', pezzo: [0.5, 0.2, 0.2], perPezzo: 1, nome: ['blocco', 'blocchi'] }
    case 'Isolanti':
      return { forma: 'pannello', pezzo: [1.0, 0.12, 0.5], perPezzo: 3, nome: ['pacco di pannelli', 'pacchi di pannelli'] }
    case 'Malte e premiscelati':
      return { forma: 'sacco', pezzo: [0.4, 0.12, 0.6], perPezzo: 1, nome: ['sacco', 'sacchi'] }
    case 'Tubi e raccordi':
      return { forma: 'tubo', pezzo: [1.2, 0.16, 0.16], perPezzo: 1, nome: ['tubo', 'tubi'] }
    case 'Serramenti':
    case 'Porte interne':
      return { forma: 'pannello', pezzo: [1.15, 0.07, 0.75], perPezzo: 1, nome: [l.categoria === 'Serramenti' ? 'serramento' : 'porta', l.categoria === 'Serramenti' ? 'serramenti' : 'porte'] }
    case 'Sanitari':
      return { forma: 'scatola', pezzo: [0.55, 0.42, 0.38], perPezzo: 1, nome: ['scatola', 'scatole'] }
    case 'Rubinetteria':
      return { forma: 'scatola', pezzo: [0.32, 0.14, 0.24], perPezzo: 1, nome: ['scatola', 'scatole'] }
  }
}

// Colore del materiale (le scatole di sanitari e rubinetti restano cartone)
const COLORI: [RegExp, string][] = [
  [/antracite/, '#4A4A47'], [/perla/, '#BDBCB6'], [/grigio cemento/, '#8F8D87'], [/olmo grigio/, '#8C8578'],
  [/grafite/, '#5C5C56'], [/grigio/, '#9A9892'],
  [/beige|sabbia/, '#CDBB98'], [/avorio|crema/, '#E4DAC0'],
  [/rovere sbiancato/, '#D2BE9A'], [/fum/, '#6F5A45'], [/miele/, '#C08A48'], [/rovere/, '#B38957'],
  [/noce/, '#6D4A2E'], [/ciliegio/, '#8E4B32'],
  [/verde/, '#9DAE92'], [/rosso/, '#B4552F'],
  [/travertino/, '#D9CCB0'], [/quarzite/, '#BDB6AA'], [/serena/, '#8A8984'], [/calcare/, '#DCD6C9'],
  [/cromo|cromat/, '#C9CCD0'], [/bianco/, '#ECEBE6'],
]
const CARTONE = '#C49A6C'

function textureDi(l: Lotto): TipoTexture {
  switch (l.categoria) {
    case 'Gres porcellanato':
    case 'Rivestimenti':
      return 'piastrelle'
    case 'Parquet':
    case 'Porte interne':
      return 'legno'
    case 'Pietra naturale':
      return 'pietra'
    case 'Laterizi':
      return 'mattoni'
    case 'Blocchi':
      return 'cls'
    case 'Isolanti':
      return 'isolante'
    case 'Malte e premiscelati':
      return 'sacco'
    case 'Tubi e raccordi':
      return 'tubo'
    case 'Serramenti':
      return 'finestra'
    case 'Sanitari':
    case 'Rubinetteria':
      return 'cartone'
  }
}

function coloreDi(l: Lotto, forma: Forma): string {
  if (forma === 'scatola') return CARTONE
  if (l.categoria === 'Malte e premiscelati') return '#D8D3C6'
  if (l.categoria === 'Tubi e raccordi') return '#8C8E8F'
  const c = l.colore.toLowerCase()
  return COLORI.find(([re]) => re.test(c))?.[1] ?? '#9A9892'
}

export function modelloBancale(l: Lotto): ModelloBancale {
  const r = regola(l)
  const [px, py, pz] = r.pezzo
  const perStrato = Math.max(1, Math.floor(BANCALE.x / px)) * Math.max(1, Math.floor(BANCALE.z / pz))
  const strati = Math.max(1, Math.floor(ALTEZZA_PILA / py))
  const perBancale = perStrato * strati

  // quanti pezzi: proporzionali alla quantità; se non ci stanno in 4 bancali, ogni pezzo vale di più
  let n: number
  let perPezzo = r.perPezzo
  if (l.unita === 'bancali') {
    n = Math.min(l.quantita, MAX_BANCALI) * perBancale
    perPezzo = 0
  } else {
    n = Math.max(1, Math.ceil(l.quantita / r.perPezzo))
    const capienza = perBancale * MAX_BANCALI
    if (n > capienza) {
      n = capienza
      perPezzo = l.quantita / n
    }
  }

  const nBancali = Math.max(1, Math.ceil(n / perBancale))
  const bancali: [number, number][] = Array.from({ length: nBancali }, (_, i) => [(i - (nBancali - 1) / 2) * PASSO_BANCALI, 0])

  // riempimento: bancale per bancale, strato per strato, righe e colonne centrate
  const nx = Math.max(1, Math.floor(BANCALE.x / px))
  const nz = Math.max(1, Math.floor(BANCALE.z / pz))
  const posizioni: [number, number, number][] = []
  for (let i = 0; i < n; i++) {
    const b = Math.floor(i / perBancale)
    const k = i % perBancale
    const strato = Math.floor(k / perStrato)
    const j = k % perStrato
    const ix = j % nx
    const iz = Math.floor(j / nx)
    posizioni.push([
      bancali[b][0] + (ix - (nx - 1) / 2) * px * 1.02,
      BANCALE.y + py / 2 + strato * py * 1.02,
      (iz - (nz - 1) / 2) * pz * 1.02,
    ])
  }
  const altezza = BANCALE.y + Math.ceil(Math.min(n, perBancale) / perStrato) * py * 1.02

  const [sing, plur] = r.nome
  let descrizione: string
  if (l.unita === 'bancali') {
    descrizione = `${l.quantita} ${l.quantita === 1 ? 'bancale' : 'bancali'}${l.quantita > MAX_BANCALI ? ` (qui ne vedi ${MAX_BANCALI})` : ''}`
  } else {
    const unita = l.unita === 'm²' ? 'm²' : 'pezzi'
    descrizione = `${formatNumero(n)} ${n === 1 ? sing : plur}`
    if (perPezzo > 1.05) descrizione += `, ognuno circa ${formatNumero(Math.round(perPezzo * 10) / 10)} ${unita}`
  }

  return {
    forma: r.forma,
    colore: coloreDi(l, r.forma),
    texture: textureDi(l),
    pezzo: r.pezzo,
    posizioni,
    bancali,
    altezza,
    larghezza: nBancali * PASSO_BANCALI,
    descrizione,
  }
}
