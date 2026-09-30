// Catalogo dei materiali: foto ↔ categoria ↔ formati ↔ colori ↔ unità ↔ peso ↔ prezzo di listino.
// Condiviso dal generatore dei dati (scripts/generate-data.ts) e dal modulo "Pubblica".
// Solo import di tipo: resta eseguibile da Node senza bundler.
import type { Categoria, Unita } from './types.ts'

export type FotoKey =
  | 'gres-grigio' | 'gres-beige' | 'gres-legno' | 'rivestimento' | 'parquet' | 'pietra'
  | 'mattoni' | 'blocchi' | 'isolante' | 'sacchi' | 'tubi' | 'lavabo' | 'wc' | 'rubinetti'
  | 'finestre' | 'porte'

export interface OpzioneUnita {
  unita: Unita
  kg: [number, number] // peso per unità
  listino: [number, number] // € per unità, nuovo
  qty: [number, number]
  peso: number // probabilità relativa
}

export interface Voce {
  foto: FotoKey
  categoria: Categoria
  alt: string
  formati: { f: string; scatolaM2?: number }[]
  colori: string[]
  opzioni: OpzioneUnita[]
  titolo: (formato: string, colore: string) => string
  nome: string // per la descrizione
  prefissoColore?: string // default "colore "
  /**
   * Cosa mostra ciascuna foto della voce (per nome file, senza .webp): un lotto riceve solo foto coerenti
   * con il suo formato e il suo colore. Una foto senza regola va bene per tutto.
   */
  fotoSe?: Record<string, { formati?: string[]; colori?: string[] }>
}

const nomeFile = (f: string) => f.replace(/^.*\//, '').replace(/\.webp$/, '')

/**
 * Le foto adatte a un lotto: prima quelle coerenti con formato e colore, poi almeno con il formato,
 * altrimenti tutte (non dovrebbe succedere: ogni combinazione del catalogo ha una foto).
 */
export function fotoAdatte<T extends string>(voce: Voce, files: T[], formato: string, colore: string): T[] {
  const ok = (f: T, colori: boolean) => {
    const r = voce.fotoSe?.[nomeFile(f)]
    return !r || ((!r.formati || r.formati.includes(formato)) && (!colori || !r.colori || r.colori.includes(colore)))
  }
  const piene = files.filter((f) => ok(f, true))
  if (piene.length) return piene
  const perFormato = files.filter((f) => ok(f, false))
  return perFormato.length ? perFormato : files
}

const m2 = (kg: [number, number], listino: [number, number], qty: [number, number]): OpzioneUnita =>
  ({ unita: 'm²', kg, listino, qty, peso: 1 })

export const CATALOGO: Voce[] = [
  {
    foto: 'gres-grigio', categoria: 'Gres porcellanato', nome: 'gres porcellanato',
    alt: 'Bancale di lastre di gres porcellanato grigio in un magazzino',
    formati: [{ f: '60x60', scatolaM2: 1.44 }, { f: '60x120', scatolaM2: 1.44 }, { f: '30x60', scatolaM2: 1.08 }, { f: '80x80', scatolaM2: 1.28 }],
    colori: ['grigio cemento', 'grigio antracite', 'grigio perla'],
    opzioni: [m2([21, 24], [28, 52], [18, 140])],
    titolo: (f, c) => `Gres ${f} ${c}`,
  },
  {
    foto: 'gres-beige', categoria: 'Gres porcellanato', nome: 'gres porcellanato',
    alt: 'Bancale di piastrelle in gres beige con una lastra appoggiata davanti',
    formati: [{ f: '60x60', scatolaM2: 1.44 }, { f: '45x90', scatolaM2: 1.22 }, { f: '30x60', scatolaM2: 1.08 }],
    colori: ['beige', 'sabbia', 'avorio', 'crema'],
    opzioni: [m2([19, 23], [24, 46], [15, 120])],
    titolo: (f, c) => `Gres ${f} ${c}`,
  },
  {
    foto: 'gres-legno', categoria: 'Gres porcellanato', nome: 'gres effetto legno',
    alt: 'Doghe in gres effetto legno impilate su un bancale',
    formati: [{ f: '20x120', scatolaM2: 1.44 }, { f: '15x90', scatolaM2: 1.08 }, { f: '20x180', scatolaM2: 1.44 }],
    colori: ['rovere naturale', 'rovere miele', 'rovere sbiancato', 'olmo grigio'],
    opzioni: [m2([18, 21], [32, 62], [12, 95])],
    titolo: (f, c) => `Gres effetto legno ${f} ${c}`,
  },
  {
    foto: 'rivestimento', categoria: 'Rivestimenti', nome: 'rivestimento in ceramica',
    alt: 'Pile di piastrelle da rivestimento bianche su un bancale',
    formati: [{ f: '20x50', scatolaM2: 1.0 }, { f: '10x30', scatolaM2: 0.9 }, { f: '7,5x30', scatolaM2: 0.72 }, { f: '30x90', scatolaM2: 1.08 }],
    colori: ['bianco lucido', 'bianco opaco', 'grigio perla', 'verde salvia'],
    opzioni: [m2([12, 16], [18, 44], [8, 60])],
    titolo: (f, c) => `Rivestimento ${f} ${c}`,
    fotoSe: { rivestimento: { colori: ['bianco lucido', 'bianco opaco', 'grigio perla'] }, 'rivestimento-2': { colori: ['verde salvia'] } },
  },
  {
    foto: 'parquet', categoria: 'Parquet', nome: 'parquet prefinito',
    alt: 'Tavole di parquet prefinito in rovere impilate su un bancale',
    formati: [{ f: '14x190x1900', scatolaM2: 2.17 }, { f: '10x140x1200', scatolaM2: 1.68 }, { f: 'spina 10x90x600', scatolaM2: 1.08 }],
    colori: ['rovere naturale', 'rovere miele', 'rovere spazzolato', 'rovere sbiancato'],
    opzioni: [m2([8, 11], [45, 96], [10, 80])],
    titolo: (f, c) => `Parquet ${c} ${f}`,
  },
  {
    foto: 'pietra', categoria: 'Pietra naturale', nome: 'pietra naturale', prefissoColore: 'in ',
    alt: 'Bancale di listelli in pietra naturale a spacco',
    formati: [{ f: 'listelli a spacco 10x40' }, { f: 'lastre 40x60' }, { f: 'lastre 60x90' }],
    colori: ['travertino', 'quarzite', 'pietra serena', 'calcare bianco'],
    opzioni: [m2([40, 55], [38, 92], [6, 48])],
    // "Pietra serena, lastre 40x60", non "Pietra pietra serena"
    titolo: (f, c) => `${c.startsWith('pietra ') ? `P${c.slice(1)}` : `Pietra ${c}`}, ${f}`,
    fotoSe: { pietra: { formati: ['listelli a spacco 10x40'] }, 'pietra-2': { formati: ['lastre 40x60', 'lastre 60x90'] } },
  },
  {
    foto: 'mattoni', categoria: 'Laterizi', nome: 'laterizi',
    alt: 'Bancale di mattoni forati rossi avvolto nel film',
    formati: [{ f: 'forato 8x25x25' }, { f: 'doppio UNI 12x12x25' }, { f: 'forato 12x25x25' }],
    colori: ['rosso'],
    opzioni: [
      { unita: 'pezzi', kg: [2.4, 5.2], listino: [0.35, 1.2], qty: [180, 2400], peso: 2 },
      { unita: 'bancali', kg: [950, 1250], listino: [260, 420], qty: [1, 6], peso: 1 },
    ],
    titolo: (f) => `Mattoni ${f.replace(/^forato /, 'forati ')}`,
    fotoSe: { mattoni: { formati: ['forato 8x25x25', 'forato 12x25x25'] }, 'mattoni-2': { formati: ['doppio UNI 12x12x25'] } },
  },
  {
    foto: 'blocchi', categoria: 'Blocchi', nome: 'blocchi in calcestruzzo',
    alt: 'Bancale di blocchi in calcestruzzo reggiati',
    formati: [{ f: 'cls 20x20x50' }, { f: 'cls 12x20x50' }, { f: 'cls 25x20x50' }],
    colori: ['grigio'],
    opzioni: [
      { unita: 'pezzi', kg: [13, 21], listino: [1.4, 2.8], qty: [40, 600], peso: 2 },
      { unita: 'bancali', kg: [1100, 1400], listino: [120, 210], qty: [1, 5], peso: 1 },
    ],
    titolo: (f) => `Blocchi ${f}`,
  },
  {
    foto: 'isolante', categoria: 'Isolanti', nome: 'pannelli isolanti',
    alt: 'Pannelli isolanti bianchi impilati e avvolti nel film',
    formati: [{ f: 'EPS 100x50 sp. 6 cm' }, { f: 'XPS 125x60 sp. 4 cm' }, { f: 'EPS 100x50 sp. 10 cm' }],
    colori: ['bianco', 'grigio grafite'],
    opzioni: [m2([1, 3], [6, 22], [20, 220])],
    titolo: (f, c) => `Isolante ${f} ${c}`,
    fotoSe: { isolante: { colori: ['bianco'] }, 'isolante-2': { colori: ['grigio grafite'] } },
  },
  {
    foto: 'sacchi', categoria: 'Malte e premiscelati', nome: 'sacchi di premiscelato',
    alt: 'Sacchi di premiscelato impilati su un bancale',
    formati: [{ f: 'collante C2TE, sacco 25 kg' }, { f: 'malta bastarda, sacco 25 kg' }, { f: 'rasante, sacco 25 kg' }, { f: 'massetto rapido, sacco 25 kg' }],
    colori: ['grigio', 'bianco'],
    opzioni: [
      { unita: 'pezzi', kg: [25, 25], listino: [6, 18], qty: [10, 120], peso: 3 },
      { unita: 'bancali', kg: [1400, 1400], listino: [340, 820], qty: [1, 3], peso: 1 },
    ],
    titolo: (f, c) => `${f.split(',')[0][0].toUpperCase()}${f.split(',')[0].slice(1)} ${c}`,
  },
  {
    foto: 'tubi', categoria: 'Tubi e raccordi', nome: 'tubi di scarico',
    alt: 'Tubi grigi in PVC impilati su una scaffalatura',
    formati: [{ f: 'PVC Ø125, barre da 3 m' }, { f: 'PVC Ø160, barre da 3 m' }, { f: 'PP Ø110, barre da 2 m' }],
    colori: ['grigio', 'arancio'],
    opzioni: [{ unita: 'pezzi', kg: [4, 9], listino: [11, 36], qty: [6, 60], peso: 1 }],
    titolo: (f) => `Tubi ${f}`,
    fotoSe: { tubi: { colori: ['grigio'] }, 'tubi-2': { colori: ['arancio'] } },
  },
  {
    foto: 'lavabo', categoria: 'Sanitari', nome: 'lavabi in ceramica',
    alt: 'Lavabo bianco in ceramica ancora nella scatola di cartone',
    formati: [{ f: 'da appoggio Ø42' }, { f: 'sospeso 60x45' }, { f: 'sottopiano 50x40' }],
    colori: ['bianco lucido', 'bianco opaco'],
    opzioni: [{ unita: 'pezzi', kg: [11, 18], listino: [90, 260], qty: [1, 12], peso: 1 }],
    titolo: (f, c) => `Lavabo ${f} ${c}`,
    fotoSe: { lavabo: { formati: ['da appoggio Ø42'] }, 'lavabo-2': { formati: ['sospeso 60x45', 'sottopiano 50x40'] } },
  },
  {
    foto: 'wc', categoria: 'Sanitari', nome: 'vasi WC in ceramica',
    alt: 'Vasi WC a terra con cassetta, nuovi e imballati',
    formati: [{ f: 'vaso a terra con cassetta 36x65' }, { f: 'vaso monoblocco a terra 37x67' }, { f: 'vaso a terra filomuro con cassetta 36x64' }],
    colori: ['bianco lucido', 'bianco opaco'],
    opzioni: [{ unita: 'pezzi', kg: [17, 26], listino: [150, 380], qty: [1, 10], peso: 1 }],
    titolo: (f, c) => `${f[0].toUpperCase()}${f.slice(1)} ${c}`,
  },
  {
    foto: 'rubinetti', categoria: 'Rubinetteria', nome: 'miscelatori',
    alt: 'Miscelatori cromati disposti su un banco di lavoro',
    formati: [{ f: 'miscelatore lavabo' }, { f: 'miscelatore cucina canna alta' }, { f: 'miscelatore bidet' }],
    colori: ['cromato', 'cromo satinato'],
    opzioni: [{ unita: 'pezzi', kg: [1.2, 2.6], listino: [60, 220], qty: [2, 24], peso: 1 }],
    titolo: (f, c) => `${f[0].toUpperCase()}${f.slice(1)} ${c}`,
  },
  {
    foto: 'finestre', categoria: 'Serramenti', nome: 'serramenti in PVC',
    alt: 'Finestre in PVC bianco appoggiate contro una scaffalatura',
    formati: [{ f: 'finestra 60x120, 1 anta' }, { f: 'finestra 100x140, 2 ante' }, { f: 'portafinestra 120x220' }],
    colori: ['bianco', 'grigio antracite'],
    opzioni: [{ unita: 'pezzi', kg: [32, 62], listino: [280, 760], qty: [1, 8], peso: 1 }],
    titolo: (f, c) => `${f[0].toUpperCase()}${f.slice(1)} PVC ${c}`,
    fotoSe: { finestre: { colori: ['bianco'] }, 'finestre-2': { colori: ['grigio antracite'] } },
  },
  {
    foto: 'porte', categoria: 'Porte interne', nome: 'porte interne',
    alt: 'Porte interne in legno appoggiate alla parete di un magazzino',
    formati: [{ f: '80x210 battente' }, { f: '70x210 battente' }, { f: '80x210 scorrevole' }],
    colori: ['noce', 'rovere', 'ciliegio', 'bianco laccato'],
    opzioni: [{ unita: 'pezzi', kg: [24, 36], listino: [180, 420], qty: [1, 10], peso: 1 }],
    titolo: (f, c) => `Porta ${c} ${f}`,
    fotoSe: { porte: { colori: ['noce', 'rovere', 'ciliegio'] }, 'porte-2': { colori: ['bianco laccato'] } },
  },
]

