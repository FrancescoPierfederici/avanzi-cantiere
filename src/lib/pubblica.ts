// Regole di "Pubblica in 60 secondi": dal catalogo (stesso del generatore dei dati)
// a categorie, peso stimato, prezzo suggerito e al lotto vero e proprio.
import { CATALOGO, type FotoKey, type Voce } from '../data/catalogo'
import { comuni } from '../data'
import type { Azienda, Categoria, ComuneId, Lotto, Unita } from '../data/types'
import { tuttiILotti } from './archivio'
import { formatNumero } from './format'

export interface Bozza {
  foto?: string
  /** la foto è stata caricata (non è una di esempio) */
  fotoPropria?: boolean
  categoria?: Categoria
  voce?: FotoKey
  formato?: string
  colore?: string
  unita?: Unita
  quantita?: number
  prezzo?: number
  comune?: ComuneId
  /** parte numerica del codice lotto, assegnata al riepilogo: il codice mostrato è quello definitivo */
  numero?: string
}

/** Categorie nell'ordine del catalogo, con le voci (tipi) di ciascuna. */
export const CATEGORIE: { categoria: Categoria; voci: Voce[] }[] = CATALOGO.reduce<{ categoria: Categoria; voci: Voce[] }[]>((acc, v) => {
  const c = acc.find((x) => x.categoria === v.categoria)
  if (c) c.voci.push(v)
  else acc.push({ categoria: v.categoria, voci: [v] })
  return acc
}, [])

export const voceDi = (k?: FotoKey) => CATALOGO.find((v) => v.foto === k)

/** Nome breve del tipo dentro una categoria (es. "gres porcellanato", "gres effetto legno"). */
export const nomeTipo = (v: Voce) => v.nome

export const opzioneDi = (v: Voce, u?: Unita) => v.opzioni.find((o) => o.unita === u) ?? v.opzioni[0]

const media = ([a, b]: [number, number]) => (a + b) / 2

/** Peso per unità (valore medio della voce). */
export const kgPerUnita = (v: Voce, u?: Unita) => media(opzioneDi(v, u).kg)

/** Prezzo di listino del nuovo per unità (valore medio della voce). */
export function listinoPerUnita(v: Voce, u?: Unita): number {
  return arrotondaPrezzo(media(opzioneDi(v, u).listino))
}

/** Prezzo suggerito: a metà della forbice 30–65% del listino. */
export const prezzoSuggerito = (v: Voce, u?: Unita) => arrotondaPrezzo(listinoPerUnita(v, u) * 0.475)

/** Passo della quantità: una scatola del formato per i m², altrimenti 1. */
export function passoPubblica(v: Voce, formato?: string, u?: Unita): number {
  if (u !== 'm²') return 1
  return v.formati.find((f) => f.f === formato)?.scatolaM2 ?? 1
}

export function arrotondaPrezzo(v: number): number {
  if (v >= 100) return Math.round(v / 5) * 5
  if (v >= 10) return Math.round(v * 2) / 2
  return Math.round(v * 100) / 100
}

/** Parola con cui la ricerca ritrova la categoria (per aprire i risultati dopo la pubblicazione). */
const PAROLA: Record<Categoria, string> = {
  'Gres porcellanato': 'gres',
  Rivestimenti: 'rivestimento',
  Parquet: 'parquet',
  'Pietra naturale': 'pietra',
  Laterizi: 'mattoni',
  Blocchi: 'blocchi',
  Isolanti: 'isolante',
  'Malte e premiscelati': 'malta',
  'Tubi e raccordi': 'tubi',
  Sanitari: 'sanitari',
  Rubinetteria: 'rubinetti',
  Serramenti: 'serramenti',
  'Porte interne': 'porte',
}
export const ricercaPer = (l: Lotto, comune: ComuneId) => `${PAROLA[l.categoria]} vicino a ${comuni.find((c) => c.id === comune)!.nome}`

/**
 * "Il tuo cantiere (demo)": ogni lotto pubblicato ha la sua posizione dentro il comune.
 * Spirale ad angolo aureo su un arco a ovest del centro (120°–240°): il mare è a est, così si resta a terra.
 */
export function tuaAzienda(id: ComuneId, k = pubblicatiNelComune(id)): Azienda {
  const c = comuni.find((x) => x.id === id)!
  const angolo = (2 * Math.PI) / 3 + ((k * 2.39996) % ((2 * Math.PI) / 3)) // tra 120° e 240°: sempre verso l'entroterra
  const raggioM = 350 + 220 * Math.sqrt(k)
  return {
    id: `TUO-${id}-${k}`,
    nome: 'Il tuo cantiere (demo)',
    tipo: 'impresa',
    comune: id,
    indirizzo: `Via del Cantiere ${k + 1}, ${c.nome}`,
    telefono: '000 000 0000',
    lat: +(c.lat + (raggioM * Math.sin(angolo)) / 110_574).toFixed(5),
    lng: +(c.lng + (raggioM * Math.cos(angolo)) / (111_320 * Math.cos((c.lat * Math.PI) / 180))).toFixed(5),
  }
}

/** Quanti lotti hai già pubblicato in quel comune (sedi già occupate). */
export const pubblicatiNelComune = (id: ComuneId) => tuttiILotti().filter((l) => l.aziendaId.startsWith(`TUO-${id}-`)).length

/** Codice lotto dalla bozza: AV-<sigla del comune>-<numero>. */
export function codiceDi(b: Bozza): string | null {
  const c = comuni.find((x) => x.id === b.comune)
  return c && b.numero ? `AV-${c.sigla}-${b.numero}` : null
}

/** Un numero libero per quel comune; se quello preferito è già usato, se ne sceglie un altro. */
export function numeroLibero(id: ComuneId, preferito?: string): string {
  const sigla = comuni.find((c) => c.id === id)!.sigla
  const usati = new Set(tuttiILotti().map((l) => l.codice))
  if (preferito && !usati.has(`AV-${sigla}-${preferito}`)) return preferito
  let n = ''
  do n = String(Math.floor(Math.random() * 9000) + 1000)
  while (usati.has(`AV-${sigla}-${n}`))
  return n
}

export function bozzaCompleta(b: Bozza): b is Required<Pick<Bozza, 'foto' | 'categoria' | 'voce' | 'formato' | 'colore' | 'unita' | 'quantita' | 'prezzo' | 'comune' | 'numero'>> & Bozza {
  return !!(b.foto && b.categoria && b.voce && b.formato && b.colore && b.unita && b.quantita && b.quantita > 0 && b.prezzo && b.prezzo > 0 && b.comune && b.numero)
}

/** Dalla bozza al lotto (con la sua azienda), pronto per l'archivio. */
export function creaLotto(b: Bozza): { lotto: Lotto; azienda: Azienda } {
  if (!bozzaCompleta(b)) throw new Error('Bozza incompleta')
  const v = voceDi(b.voce)!
  const azienda = tuaAzienda(b.comune)
  // il codice è quello già mostrato nel riepilogo
  const codice = codiceDi(b)!
  const titolo = v.titolo(b.formato, b.colore)
  const unitaTesto = b.unita === 'bancali' ? (b.quantita === 1 ? 'bancale' : 'bancali') : b.unita
  const lotto: Lotto = {
    id: `U${Date.now().toString(36)}`,
    codice,
    categoria: v.categoria,
    titolo,
    descrizione: `${formatNumero(b.quantita)} ${unitaTesto} di ${v.nome}, ${b.formato}, colore ${b.colore}. Pubblicato ora da Il tuo cantiere (demo).`,
    formato: b.formato,
    colore: b.colore,
    quantita: b.quantita,
    unita: b.unita,
    pesoKg: Math.round(b.quantita * kgPerUnita(v, b.unita)),
    prezzo: b.prezzo,
    prezzoListino: listinoPerUnita(v, b.unita),
    foto: b.foto,
    fotoAlt: b.fotoPropria ? `Foto caricata: ${titolo}` : v.alt,
    fotoVar: { posX: 50, posY: 50, flip: false, zoom: 1 },
    aziendaId: azienda.id,
    data: new Date().toISOString().slice(0, 10),
    stato: 'disponibile',
  }
  return { lotto, azienda }
}

/** Ridimensiona una foto del telefono a 1200 px sul lato lungo (WebP, o JPEG se il browser non lo sa fare). */
export async function preparaFoto(file: File): Promise<string> {
  const bmp = await createImageBitmap(file)
  const scala = Math.min(1, 1200 / Math.max(bmp.width, bmp.height))
  const c = document.createElement('canvas')
  c.width = Math.round(bmp.width * scala)
  c.height = Math.round(bmp.height * scala)
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height)
  bmp.close()
  const webp = c.toDataURL('image/webp', 0.78)
  return webp.startsWith('data:image/webp') ? webp : c.toDataURL('image/jpeg', 0.8)
}
