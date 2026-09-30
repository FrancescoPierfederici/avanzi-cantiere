// Parser della ricerca in linguaggio naturale. Niente API, niente import di runtime:
// "gres 60x60 grigio vicino a Senigallia" → { categoria, misura, colore, comune }.

import type { Categoria, Comune, ComuneId, Luogo } from '../data/types.ts'

export interface Query {
  categoria?: Categoria
  /** parola che deve comparire nel titolo del lotto (es. "lavabo", "effetto legno") */
  sottotipo?: string
  /** etichetta leggibile per la categoria riconosciuta */
  etichetta?: string
  misura?: [number, number]
  /** parole di colore, tutte richieste */
  colore?: string[]
  comune?: ComuneId
  /** un altro comune italiano (o una frazione della zona demo), dall'elenco completo */
  luogo?: Luogo
  /** "sicilia": la regione scritta, centrata sul capoluogo (in luogo o comune) */
  regione?: string
  /** "vicino a Parigi": luogo che non è un comune italiano */
  comuneSconosciuto?: string
  /** parole non capite */
  ignorate: string[]
}

export function normalizza(testo: string): string {
  return testo
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/×/g, 'x')
    .replace(/[^a-z0-9,.\s'x-]/g, ' ')
    .replace(/'/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

type Sinonimo = [chiavi: string[], categoria: Categoria, etichetta: string, sottotipo?: string]

// Le chiavi più lunghe vengono provate per prime ("porta finestra" prima di "porta").
const SINONIMI: Sinonimo[] = [
  [['effetto legno', 'gres legno'], 'Gres porcellanato', 'Gres effetto legno', 'effetto legno'],
  [['gres', 'porcellanato', 'piastrelle', 'piastrella', 'pavimento', 'pavimenti', 'mattonelle', 'mattonella'], 'Gres porcellanato', 'Gres porcellanato'],
  [['rivestimento', 'rivestimenti'], 'Rivestimenti', 'Rivestimenti'],
  [['parquet', 'prefinito', 'listoni'], 'Parquet', 'Parquet'],
  [['pietra naturale', 'pietra', 'pietre', 'opus incertum', 'listelli'], 'Pietra naturale', 'Pietra naturale'],
  [['forati', 'forato'], 'Laterizi', 'Mattoni forati', 'forat'],
  [['mattoni', 'mattone', 'laterizi', 'laterizio', 'doppio uni'], 'Laterizi', 'Laterizi'],
  [['blocchi', 'blocco', 'cls', 'calcestruzzo'], 'Blocchi', 'Blocchi'],
  [['pannelli isolanti', 'isolante', 'isolanti', 'eps', 'xps', 'polistirene', 'polistirolo', 'cappotto'], 'Isolanti', 'Isolanti'],
  [['collante', 'colla'], 'Malte e premiscelati', 'Collante', 'collante'],
  [['massetto'], 'Malte e premiscelati', 'Massetto', 'massetto'],
  [['rasante'], 'Malte e premiscelati', 'Rasante', 'rasante'],
  [['malta', 'malte', 'sacchi', 'sacco', 'premiscelato', 'premiscelati'], 'Malte e premiscelati', 'Malte e premiscelati'],
  [['tubi', 'tubo', 'pvc', 'scarico', 'scarichi', 'raccordi'], 'Tubi e raccordi', 'Tubi e raccordi'],
  [['lavabo', 'lavabi', 'lavandino', 'lavandini', 'lavello'], 'Sanitari', 'Lavabi', 'lavabo'],
  [['wc', 'water', 'vaso', 'vasi', 'gabinetto'], 'Sanitari', 'Vasi WC', 'vaso'],
  [['bidet'], 'Sanitari', 'Bidet', 'bidet'],
  [['sanitari', 'sanitario'], 'Sanitari', 'Sanitari'],
  [['rubinetto', 'rubinetti', 'miscelatore', 'miscelatori', 'rubinetteria'], 'Rubinetteria', 'Rubinetteria'],
  [['porta finestra', 'portafinestra', 'portafinestre'], 'Serramenti', 'Portafinestre', 'portafinestra'],
  [['finestra', 'finestre', 'serramenti', 'serramento', 'infissi', 'infisso'], 'Serramenti', 'Serramenti'],
  [['porte interne', 'porta', 'porte'], 'Porte interne', 'Porte interne'],
]

const CHIAVI = SINONIMI.flatMap((s) => s[0].map((k) => ({ k, s }))).sort((a, b) => b.k.length - a.k.length)

// Parole di colore presenti nei dati (e poche varianti comuni).
const COLORI: Record<string, string> = {
  grigio: 'grigio', grigi: 'grigio', grigia: 'grigio', grigie: 'grigio',
  antracite: 'antracite', perla: 'perla', cemento: 'cemento',
  beige: 'beige', sabbia: 'sabbia', avorio: 'avorio', crema: 'crema',
  bianco: 'bianco', bianchi: 'bianco', bianca: 'bianco', bianche: 'bianco',
  rosso: 'rosso', rossi: 'rosso', verde: 'verde', salvia: 'salvia',
  rovere: 'rovere', noce: 'noce', ciliegio: 'ciliegio', olmo: 'olmo', miele: 'miele', fume: 'fume',
  travertino: 'travertino', quarzite: 'quarzite', serena: 'serena', calcare: 'calcare',
  grafite: 'grafite', cromato: 'cromato', cromo: 'cromo', satinato: 'satinato',
  lucido: 'lucido', opaco: 'opaco', arancio: 'arancio', arancione: 'arancio', laccato: 'laccato', laccata: 'laccato',
}

const PREPOSIZIONI_LUOGO = ['vicino a', 'vicino', 'dalle parti di', 'intorno a', 'nei pressi di', 'in zona', 'zona', 'a', 'ad', 'in', 'da', 'verso']

const PAROLE_VUOTE = new Set([
  'di', 'da', 'a', 'ad', 'in', 'con', 'per', 'su', 'vicino', 'zona', 'cerco', 'cerca', 'cercasi', 'voglio', 'vorrei',
  'mi', 'servono', 'serve', 'servirebbero', 'del', 'della', 'dello', 'dei', 'delle', 'degli', 'il', 'lo', 'la', 'i', 'gli',
  'le', 'un', 'una', 'uno', 'e', 'o', 'circa', 'm2', 'mq', 'metri', 'quadri', 'pezzi', 'pz', 'qualche', 'parti',
  'intorno', 'pressi', 'nei', 'colore', 'formato', 'misura', 'cm', 'nuovo', 'nuove', 'nuovi', 'avanzo', 'avanzi',
  'materiale', 'materiali', 'economico', 'economici', 'dalle', 'verso', 'tipo',
])

// Regioni → capoluogo di regione
const REGIONI: [nomi: string[], nome: string, capoluogo: string][] = [
  [['abruzzo'], 'Abruzzo', "L'Aquila"],
  [['basilicata', 'lucania'], 'Basilicata', 'Potenza'],
  [['calabria'], 'Calabria', 'Catanzaro'],
  [['campania'], 'Campania', 'Napoli'],
  [['emilia romagna', 'emilia-romagna', 'emilia', 'romagna'], 'Emilia-Romagna', 'Bologna'],
  [['friuli venezia giulia', 'friuli-venezia giulia', 'friuli'], 'Friuli-Venezia Giulia', 'Trieste'],
  [['lazio'], 'Lazio', 'Roma'],
  [['liguria'], 'Liguria', 'Genova'],
  [['lombardia'], 'Lombardia', 'Milano'],
  [['marche'], 'Marche', 'Ancona'],
  [['molise'], 'Molise', 'Campobasso'],
  [['piemonte'], 'Piemonte', 'Torino'],
  [['puglia', 'puglie'], 'Puglia', 'Bari'],
  [['sardegna'], 'Sardegna', 'Cagliari'],
  [['sicilia'], 'Sicilia', 'Palermo'],
  [['toscana'], 'Toscana', 'Firenze'],
  [['trentino alto adige', 'trentino-alto adige', 'trentino'], 'Trentino-Alto Adige', 'Trento'],
  [['alto adige', 'sudtirolo'], 'Alto Adige', 'Bolzano'],
  [['umbria'], 'Umbria', 'Perugia'],
  [["valle d'aosta", "val d'aosta", 'valle daosta', 'vda'], "Valle d'Aosta", 'Aosta'],
  [['veneto'], 'Veneto', 'Venezia'],
]
const CHIAVI_REGIONI = REGIONI.flatMap(([nomi, nome, cap]) => nomi.map((k) => ({ k: normalizza(k), nome, cap }))).sort((a, b) => b.k.length - a.k.length)

// Parole che la ricerca usa già: un comune che si chiama così (Porte, Lavello…) conta solo dopo "a", "vicino a"…
const VOCABOLARIO = new Set([...CHIAVI.flatMap(({ k }) => [k, ...k.split(' ')]), ...Object.keys(COLORI), ...PAROLE_VUOTE])

interface Voce {
  n: string
  l: Luogo
  /** serve la preposizione davanti */
  debole: boolean
}
const indici = new WeakMap<Luogo[], Voce[]>()

/** Nomi normalizzati, dal più lungo; a parità di nome prima le frazioni della zona demo, poi i comuni più popolosi. */
function indice(luoghi: Luogo[]): Voce[] {
  let v = indici.get(luoghi)
  if (!v) {
    v = luoghi
      .flatMap((l) => l.nomi.map((nome) => ({ n: normalizza(nome), l })))
      .map((x) => ({ ...x, debole: x.n.length <= 3 || VOCABOLARIO.has(x.n) }))
      .sort((a, b) => b.n.length - a.n.length || Number(!!b.l.frazione) - Number(!!a.l.frazione) || b.l.fascia - a.l.fascia)
    indici.set(luoghi, v)
  }
  return v
}

export function interpreta(testo: string, comuni: Comune[], luoghi?: Luogo[]): Query {
  let t = ` ${normalizza(testo)} `
  const q: Query = { ignorate: [] }
  const togli = (frammento: string) => {
    t = t.replace(` ${frammento} `, ' ')
  }

  // 1. comune (anche se composto da più parole)
  for (const c of comuni) {
    const nome = normalizza(c.nome)
    if (t.includes(` ${nome} `)) {
      q.comune = c.id
      const prep = PREPOSIZIONI_LUOGO.find((p) => t.includes(` ${p} ${nome} `))
      togli(prep ? `${prep} ${nome}` : nome)
      break
    }
  }
  // 1b. regione → capoluogo, poi tutti i comuni italiani e le frazioni della zona demo
  if (!q.comune && luoghi) {
    const voci = indice(luoghi)
    const prepDavanti = (nome: string) => PREPOSIZIONI_LUOGO.find((p) => t.includes(` ${p} ${nome} `))
    // "Reggio Emilia" è un comune, non la regione: vince il nome più lungo
    const reg = CHIAVI_REGIONI.find(({ k }) => t.includes(` ${k} `))
    const comuneLungo = reg && voci.find((v) => v.n.length > reg.k.length && v.n.includes(reg.k) && t.includes(` ${v.n} `))
    if (reg && !comuneLungo) {
      const cap = normalizza(reg.cap)
      const base = comuni.find((c) => normalizza(c.nome) === cap)
      if (base) q.comune = base.id
      else q.luogo = voci.find((v) => v.n === cap && !v.l.frazione)?.l
      if (q.comune || q.luogo) {
        q.regione = reg.nome
        const prep = prepDavanti(reg.k)
        togli(prep ? `${prep} ${reg.k}` : reg.k)
      }
    }
    if (!q.comune && !q.luogo) {
      for (const v of voci) {
        if (!t.includes(` ${v.n} `)) continue
        const prep = prepDavanti(v.n)
        if (v.debole && !prep) continue
        // omonimi (Livo CO / Livo TN): la sigla della provincia subito dopo il nome sceglie quello giusto
        let scelto = v.l
        let dopo = ''
        const omonimi = voci.filter((x) => x.n === v.n && x.l.provincia)
        for (const o of omonimi) {
          const pr = o.l.provincia!.toLowerCase()
          if (t.includes(` ${v.n} ${pr} `)) {
            scelto = o.l
            dopo = ` ${pr}`
            break
          }
        }
        q.luogo = scelto
        togli(`${prep ? `${prep} ` : ''}${v.n}${dopo}`)
        break
      }
    }
  }
  if (!q.comune && !q.luogo) {
    const m = t.match(/ (?:vicino a|dalle parti di|intorno a|nei pressi di|in zona|zona|a|ad) ([a-z][a-z ]{2,24}?) $/)
    if (m) {
      const candidato = m[1].trim()
      const riconoscibile = CHIAVI.some(({ k }) => candidato.includes(k)) || candidato.split(' ').some((p) => p in COLORI)
      if (!riconoscibile) {
        q.comuneSconosciuto = candidato.replace(/\b\w/g, (c) => c.toUpperCase())
        t = t.slice(0, m.index) + ' '
      }
    }
  }

  // 2. misura: 60x60, 60 x 120, 7,5x30 (anche 14x190x1900 → prime due)
  const mis = t.match(/ (\d+(?:[.,]\d+)?) ?x ?(\d+(?:[.,]\d+)?)(?: ?x ?\d+(?:[.,]\d+)?)? /)
  if (mis) {
    q.misura = [numero(mis[1]), numero(mis[2])]
    t = t.replace(mis[0], ' ')
  }

  // 3. categoria (la chiave più lunga vince)
  for (const { k, s } of CHIAVI) {
    if (t.includes(` ${k} `)) {
      q.categoria = s[1]
      q.etichetta = s[2]
      q.sottotipo = s[3]
      togli(k)
      break
    }
  }
  // "mattoni forati": trovata la categoria, cerco un sottotipo della stessa categoria tra le parole rimaste
  if (q.categoria && !q.sottotipo) {
    const sotto = CHIAVI.find(({ k, s }) => s[1] === q.categoria && s[3] && t.includes(` ${k} `))
    if (sotto) {
      q.etichetta = sotto.s[2]
      q.sottotipo = sotto.s[3]
      togli(sotto.k)
    }
  }

  // 4. colori e parole rimaste
  const colori: string[] = []
  for (const parola of t.trim().split(' ').filter(Boolean)) {
    if (parola in COLORI) {
      const c = COLORI[parola]
      // "gres cemento": cemento è colore solo se non è la categoria
      if (!colori.includes(c)) colori.push(c)
    } else if (!PAROLE_VUOTE.has(parola) && !/^\d+([.,]\d+)?$/.test(parola)) {
      q.ignorate.push(parola)
    }
  }
  if (colori.length) q.colore = colori

  return q
}

function numero(s: string): number {
  return Number(s.replace(',', '.'))
}

/** Estrae tutte le coppie AxB da un formato ("14x190x1900" → [14,190],[190,1900]). */
export function coppieMisura(formato: string): [number, number][] {
  const out: [number, number][] = []
  for (const m of normalizza(formato).matchAll(/\d+(?:[.,]\d+)?(?:x\d+(?:[.,]\d+)?)+/g)) {
    const n = m[0].split('x').map(numero)
    for (let i = 0; i < n.length - 1; i++) out.push([n[i], n[i + 1]])
  }
  return out
}

export function misuraCorrisponde(formato: string, [a, b]: [number, number]): boolean {
  return coppieMisura(formato).some(([x, y]) => (x === a && y === b) || (x === b && y === a))
}

export function coloreCorrisponde(colore: string, parole: string[]): boolean {
  const c = normalizza(colore)
  return parole.every((p) => c.includes(p))
}

/** Rigenera un testo leggibile a partire dalla query (per quando si toglie un filtro). */
export function testoDa(q: Query, comuni: Comune[]): string {
  const parti: string[] = []
  if (q.etichetta) parti.push(q.etichetta.toLowerCase())
  if (q.misura) parti.push(`${fmt(q.misura[0])}x${fmt(q.misura[1])}`)
  if (q.colore) parti.push(q.colore.join(' '))
  const c = comuni.find((x) => x.id === q.comune)
  const nome = c?.nome ?? q.luogo?.nome
  if (nome) parti.push(`vicino a ${nome}`)
  return parti.join(' ')
}

function fmt(n: number): string {
  return String(n).replace('.', ',')
}
