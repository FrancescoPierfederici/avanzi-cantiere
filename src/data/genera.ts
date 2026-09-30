// Generatore dei lotti fittizi, condiviso da scripts/generate-data.ts (zona di Senigallia)
// e da src/lib/zone.ts (le altre città, generate al momento).
// Tutti i nomi e i testi sono INVENTATI. L'ordine delle chiamate all'rng conta:
// cambiarlo cambierebbe i dati di Senigallia.

import type { Rng } from '../lib/rng.ts'
import { CATALOGO, type FotoKey, type Voce } from './catalogo.ts'
import type { FotoVar, TipoAzienda } from './types.ts'

/** Data di riferimento fissa (non Date.now()): i lotti hanno date da 0 a 60 giorni prima. */
export const DATA_RIFERIMENTO = Date.UTC(2026, 8, 28)

export const TUTTO: FotoKey[] = CATALOGO.map((v) => v.foto)
export const FINITURE: FotoKey[] = ['gres-grigio', 'gres-beige', 'gres-legno', 'rivestimento', 'parquet', 'pietra', 'lavabo', 'wc', 'rubinetti', 'porte']
export const GREZZO: FotoKey[] = ['mattoni', 'blocchi', 'isolante', 'sacchi', 'tubi', 'gres-grigio', 'gres-beige', 'finestre']
export const IDRAULICA: FotoKey[] = ['tubi', 'lavabo', 'wc', 'rubinetti']
export const LEGNO: FotoKey[] = ['porte', 'finestre', 'parquet']
export const POSA: FotoKey[] = ['gres-grigio', 'gres-beige', 'gres-legno', 'rivestimento', 'pietra', 'parquet', 'sacchi']

export const VIE = [
  "Via dell'Industria", 'Via delle Fornaci', "Via dell'Artigianato", 'Via del Lavoro', 'Via dei Mestieri',
  'Via delle Querce', 'Via della Stazione', 'Via dei Tigli', 'Via del Commercio', 'Via delle Cave',
  'Via della Fornace Vecchia', 'Via dei Muratori', 'Via delle Ginestre', 'Via del Molino', 'Via dei Carpentieri',
]

export const MOTIVI = [
  'Avanzo di cantiere: ordine sovrastimato.',
  'Il cliente ha cambiato progetto a lavori iniziati.',
  'Fine serie di magazzino, non più a catalogo.',
  'Reso di un cliente mai ritirato.',
  'Rimanenza dopo la chiusura del cantiere.',
  'Doppia consegna del fornitore, non restituibile.',
  'Colore scelto e poi scartato dal committente.',
]
export const CONDIZIONI = [
  'Materiale nuovo, mai posato, imballi originali.',
  'Nuovo, alcune confezioni aperte solo per verifica.',
  'Nuovo, imballo integro. Carico con muletto disponibile.',
  'Nuovo, conservato al coperto.',
]

/** Assortimento presente in ogni zona: il materiale comune si trova vicino a tutti. */
export const ASSORTIMENTO_BASE: { voce: FotoKey; formato?: string }[] = [
  { voce: 'gres-grigio', formato: '60x60' },
  { voce: 'gres-grigio', formato: '60x60' },
  { voce: 'gres-grigio' },
  { voce: 'gres-beige' },
  { voce: 'mattoni' },
  { voce: 'sacchi' },
  { voce: 'isolante' },
  { voce: 'blocchi' },
]

/** Il resto a caso, con più peso ai materiali comuni. */
export const PESO_VOCE: Partial<Record<FotoKey, number>> = {
  'gres-grigio': 3, 'gres-beige': 2, mattoni: 3, sacchi: 3, isolante: 2.5, blocchi: 2,
}

export const PESO_TIPO: Record<TipoAzienda, number> = { rivendita: 4, showroom: 3, impresa: 3, artigiano: 2 }

// nel gres il 60x60 è più frequente degli altri formati
const pesoFormato = (f: string) => (f === '60x60' ? 3 : 1)

export const voceDi = (k: FotoKey): Voce => CATALOGO.find((v) => v.foto === k)!

/** Formato, colore, quantità, peso e prezzi di un lotto (prima parte delle chiamate all'rng). */
export function materiale(rng: Rng, voce: Voce, formatoVoluto?: string) {
  const formato = formatoVoluto
    ? voce.formati.find((f) => f.f === formatoVoluto)!
    : rng.weighted(voce.formati, voce.formati.map((f) => pesoFormato(f.f)))
  const colore = rng.pick(voce.colori)
  const opz = rng.weighted(voce.opzioni, voce.opzioni.map((o) => o.peso))

  let quantita: number
  if (opz.unita === 'm²' && formato.scatolaM2) {
    const scatole = rng.int(Math.ceil(opz.qty[0] / formato.scatolaM2), Math.floor(opz.qty[1] / formato.scatolaM2))
    quantita = round(scatole * formato.scatolaM2, 1)
  } else if (opz.unita === 'm²') {
    quantita = rng.int(opz.qty[0], opz.qty[1])
  } else {
    // pezzi grandi arrotondati a multipli "da bancale"
    const q = rng.int(opz.qty[0], opz.qty[1])
    quantita = q >= 200 ? Math.round(q / 20) * 20 : q
  }

  const kgUnita = rng.range(opz.kg[0], opz.kg[1])
  const pesoTot = quantita * kgUnita
  const pesoKg = pesoTot >= 1000 ? Math.round(pesoTot / 10) * 10 : Math.round(pesoTot)

  const prezzoListino = arrotondaPrezzo(rng.range(opz.listino[0], opz.listino[1]))
  const prezzo = arrotondaPrezzo(prezzoListino * rng.range(0.3, 0.65))
  return { formato, colore, opz, quantita, pesoKg, prezzoListino, prezzo }
}

/** Titolo e descrizione (seconda parte delle chiamate all'rng: motivo e condizioni). */
export function testi(rng: Rng, voce: Voce, m: ReturnType<typeof materiale>) {
  const { formato, colore, opz, quantita } = m
  const qtyTesto = opz.unita === 'bancali'
    ? `${quantita} ${quantita === 1 ? 'bancale' : 'bancali'}`
    : `${formatIt(quantita)} ${opz.unita}`
  const colorePart = voce.colori.length > 1 ? `, ${voce.prefissoColore ?? 'colore '}${colore}` : ''
  return {
    titolo: voce.titolo(formato.f, colore),
    descrizione: `${qtyTesto} di ${voce.nome}, ${formato.f}${colorePart}. ${rng.pick(MOTIVI)} ${rng.pick(CONDIZIONI)}`,
  }
}

// Variazioni della foto: 5 posX × 3 posY × flip = 30 combinazioni distinte per file.
export const COMBO: Omit<FotoVar, 'zoom'>[] = []
for (const posX of [15, 35, 50, 65, 85]) for (const posY of [25, 50, 75]) for (const flip of [false, true]) COMBO.push({ posX, posY, flip })
export const ZOOM = [1, 1.08, 1.15, 1.22]

export function round(v: number, d: number): number {
  const k = 10 ** d
  return Math.round(v * k) / k
}

export function arrotondaPrezzo(v: number): number {
  if (v >= 100) return Math.round(v / 5) * 5
  if (v >= 10) return Math.round(v * 2) / 2
  return round(v, 2)
}

export function formatIt(n: number): string {
  return n.toLocaleString('it-IT', { maximumFractionDigits: 1 })
}
