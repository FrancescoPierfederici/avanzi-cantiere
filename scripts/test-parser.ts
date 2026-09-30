// Test del parser e della ricerca. Uso: npm run test:parser
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import type { Azienda, Comune, Lotto } from '../src/data/types.ts'
import { cerca } from '../src/lib/cerca.ts'
import { parseLuoghi } from '../src/lib/luoghi.ts'
import { interpreta, misuraCorrisponde } from '../src/lib/parser.ts'

const leggi = <T>(f: string): T => JSON.parse(readFileSync(`src/data/${f}`, 'utf8'))
const comuni = leggi<Comune[]>('comuni.json')
const lotti = leggi<Lotto[]>('lotti.json')
const aziende = leggi<Azienda[]>('aziende.json')
const luoghi = parseLuoghi(readFileSync('src/data/comuni-italia.txt', 'utf8'))

let ok = 0
function caso(nome: string, fn: () => void) {
  try {
    fn()
    ok++
  } catch (e) {
    console.error(`✗ ${nome}\n  ${(e as Error).message}`)
    process.exitCode = 1
  }
}
const q = (t: string) => interpreta(t, comuni)

caso('frase completa', () => {
  const r = q('gres 60x60 grigio vicino a Senigallia')
  assert.equal(r.categoria, 'Gres porcellanato')
  assert.deepEqual(r.misura, [60, 60])
  assert.deepEqual(r.colore, ['grigio'])
  assert.equal(r.comune, 'senigallia')
  assert.deepEqual(r.ignorate, [])
})
caso('maiuscole, accenti, simbolo ×', () => {
  const r = q('GRES 60×120 Grigio  a  SENIGALLIA')
  assert.deepEqual(r.misura, [60, 120])
  assert.equal(r.comune, 'senigallia')
})
caso('misura con spazi e decimali', () => {
  assert.deepEqual(q('rivestimento 7,5 x 30 bianco').misura, [7.5, 30])
  assert.equal(q('rivestimento 7,5 x 30 bianco').categoria, 'Rivestimenti')
})
caso('comune senza preposizione', () => assert.equal(q('mattoni Jesi').comune, 'jesi'))
caso('"dalle parti di"', () => {
  const r = q('porte noce dalle parti di Osimo')
  assert.equal(r.comune, 'osimo')
  assert.equal(r.categoria, 'Porte interne')
  assert.deepEqual(r.colore, ['noce'])
  assert.deepEqual(r.ignorate, [])
})
caso('forati → laterizi con sottotipo', () => {
  const r = q('mattoni forati a Jesi')
  assert.equal(r.categoria, 'Laterizi')
  assert.equal(r.sottotipo, 'forat')
  assert.deepEqual(r.ignorate, [])
})
caso('effetto legno prima di parquet', () => {
  const r = q('gres effetto legno rovere')
  assert.equal(r.categoria, 'Gres porcellanato')
  assert.equal(r.sottotipo, 'effetto legno')
  assert.deepEqual(r.colore, ['rovere'])
})
caso('portafinestra prima di porta', () => {
  assert.equal(q('porta finestra pvc').categoria, 'Serramenti')
  assert.equal(q('porta finestra pvc').sottotipo, 'portafinestra')
})
caso('sottotipo dopo la categoria', () => {
  assert.equal(q('sanitari lavabo').sottotipo, 'lavabo')
  assert.equal(q('malta collante').sottotipo, 'collante')
})
caso('sinonimi sanitari', () => {
  assert.equal(q('lavandino').sottotipo, 'lavabo')
  assert.equal(q('wc sospeso').sottotipo, 'vaso')
  assert.equal(q('miscelatore cucina').categoria, 'Rubinetteria')
  assert.equal(q('cappotto eps').categoria, 'Isolanti')
})
caso('comune fuori lista', () => {
  const r = q('gres grigio vicino a Roma')
  assert.equal(r.comune, undefined)
  assert.equal(r.comuneSconosciuto, 'Roma')
  assert.equal(r.categoria, 'Gres porcellanato')
})
caso('"a" seguito da colore non è un comune', () => {
  assert.equal(q('piastrelle a grigio').comuneSconosciuto, undefined)
})
caso('parole non capite', () => assert.deepEqual(q('gres fantastico 60x60').ignorate, ['fantastico']))
caso('vuoto', () => assert.deepEqual(q('   '), { ignorate: [] }))
caso('solo comune', () => {
  const r = q('Fano')
  assert.equal(r.comune, 'fano')
  assert.equal(r.categoria, undefined)
})
caso('misura corrisponde in entrambi gli ordini', () => {
  assert.ok(misuraCorrisponde('60x120', [120, 60]))
  assert.ok(misuraCorrisponde('14x190x1900', [190, 1900]))
  assert.ok(misuraCorrisponde('7,5x30', [7.5, 30]))
  assert.ok(!misuraCorrisponde('60x60', [60, 120]))
})

const dati = { lotti, aziende, comuni, zonaPredefinita: 'senigallia' as const }

caso('ricerca esatta ordinata per distanza', () => {
  const r = cerca(q('gres grigio vicino a Senigallia'), dati)
  const esatti = r.trovati.slice(0, r.nEsatti)
  assert.ok(esatti.length > 0)
  assert.ok(esatti.every((t) => t.esatto && t.lotto.categoria === 'Gres porcellanato' && t.lotto.colore.includes('grigio')))
  assert.ok(esatti.every((t, i, a) => i === 0 || a[i - 1].km <= t.km))
  assert.equal(r.allargata, undefined)
})
caso('dopo gli esatti vengono i simili della stessa categoria', () => {
  const r = cerca(q('gres 60x60 grigio vicino a Senigallia'), dati)
  const simili = r.trovati.slice(r.nEsatti)
  assert.ok(simili.length > 0)
  assert.ok(simili.every((t) => !t.esatto && t.lotto.categoria === 'Gres porcellanato'))
})
caso('allargamento quando non c\'è la misura', () => {
  const r = cerca(q('gres 33x33 vicino a Jesi'), dati)
  assert.ok(r.trovati.length > 0)
  assert.equal(r.allargata, '33x33')
  assert.ok(r.trovati.every((t) => !t.esatto))
})
caso('solo zona: tutti i lotti vicini', () => {
  const r = cerca(q('Pesaro'), dati)
  assert.ok(r.soloZona)
  assert.equal(r.riferimento.id, 'pesaro')
  assert.ok(r.trovati.length > 0)
  assert.ok(r.trovati.every((t) => t.km <= 30))
})
caso('zona predefinita senza comune', () => {
  assert.equal(cerca(q('lavabo'), dati).riferimento.id, 'senigallia')
})

// ── tutta Italia: comuni, regioni, frazioni (con l'elenco GeoNames) ─────────
const qi = (t: string) => interpreta(t, comuni, luoghi)

caso('elenco: ~7.900 comuni e le frazioni della zona', () => {
  assert.ok(luoghi.filter((l) => !l.frazione).length > 7800)
  assert.ok(luoghi.some((l) => l.frazione && l.nome === 'Marotta'))
})
caso('comune fuori zona', () => {
  const r = qi('gres vicino a Torino')
  assert.equal(r.luogo?.nome, 'Torino')
  assert.equal(r.luogo?.provincia, 'TO')
  assert.equal(r.categoria, 'Gres porcellanato')
  assert.deepEqual(r.ignorate, [])
})
caso('i 7 comuni della demo restano quelli di sempre', () => {
  const r = qi('gres 60x60 grigio vicino a Senigallia')
  assert.equal(r.comune, 'senigallia')
  assert.equal(r.luogo, undefined)
})
caso('senza elenco: il comune fuori zona non si riconosce ancora', () => {
  assert.equal(q('mattoni vicino a Torino').comuneSconosciuto, 'Torino')
})
caso('regione → capoluogo', () => {
  const r = qi('sicilia')
  assert.equal(r.regione, 'Sicilia')
  assert.equal(r.luogo?.nome, 'Palermo')
  assert.deepEqual(r.ignorate, [])
})
caso('regione della demo → comune base', () => {
  const r = qi('mattoni nelle marche')
  assert.equal(r.comune, 'ancona')
  assert.equal(r.regione, 'Marche')
})
caso("regione con apostrofo e più parole", () => {
  assert.equal(qi("gres in valle d'aosta").luogo?.nome, 'Aosta')
  assert.equal(qi('porte emilia romagna').luogo?.nome, 'Bologna')
})
caso('frazione della zona demo', () => {
  const r = qi('gres vicino a Marotta')
  assert.equal(r.luogo?.nome, 'Marotta')
  assert.ok(r.luogo?.frazione)
})
caso('frazione senza preposizione', () => {
  assert.equal(qi('mattoni Marotta').luogo?.nome, 'Marotta')
})
caso('comune della zona demo non nei 7', () => {
  const r = qi('isolante Corinaldo')
  assert.equal(r.luogo?.nome, 'Corinaldo')
  assert.deepEqual(r.ignorate, [])
})
caso('nome lungo prima di quello corto', () => {
  assert.equal(qi('gres a San Giovanni in Persiceto').luogo?.nome, 'San Giovanni in Persiceto')
  assert.equal(qi('gres a Cesano Maderno').luogo?.nome, 'Cesano Maderno')
})
caso("nomi d'uso", () => {
  assert.equal(qi('gres a Reggio Emilia').luogo?.provincia, 'RE')
  assert.equal(qi('gres a Reggio Calabria').luogo?.provincia, 'RC')
  assert.equal(qi('gres a Bolzano').luogo?.provincia, 'BZ')
})
caso('omonimi: vince il più popoloso, la provincia sceglie', () => {
  assert.equal(qi('gres a Livo').luogo?.provincia, 'TN')
  const r = qi('gres a Livo CO')
  assert.equal(r.luogo?.provincia, 'CO')
  assert.deepEqual(r.ignorate, [])
})
caso('parole del vocabolario che sono anche comuni', () => {
  const porte = qi('porte noce Pesaro')
  assert.equal(porte.categoria, 'Porte interne')
  assert.equal(porte.comune, 'pesaro')
  const lav = qi('lavello a Lavello')
  assert.equal(lav.sottotipo, 'lavabo')
  assert.equal(lav.luogo?.nome, 'Lavello')
  assert.equal(qi('lavello bianco').luogo, undefined)
})
caso('nessun falso comune nelle ricerche di tutti i giorni', () => {
  for (const t of ['gres 60x60 grigio', 'mattoni forati', 'porte interne noce', 'rubinetti cromati', 'sacchi di colla', 'pietra naturale beige', 'parquet rovere', 'finestre pvc bianche', 'wc sospeso bianco']) {
    const r = qi(t)
    assert.equal(r.luogo, undefined, `${t} → ${r.luogo?.nome}`)
  }
})
caso('luogo non italiano', () => {
  const r = qi('gres vicino a Parigi')
  assert.equal(r.comuneSconosciuto, 'Parigi')
  assert.equal(r.luogo, undefined)
})
caso('parola sconosciuta resta "non ho capito"', () => {
  assert.deepEqual(qi('gres xyzw').ignorate, ['xyzw'])
})
caso('ricerca fuori zona con il riferimento del comune', () => {
  const l = qi('Torino').luogo!
  const rif: Comune = { id: 'TO-TOR', nome: l.nome, sigla: 'TOR', lat: l.lat, lng: l.lng, raggioKm: 2, zona: 'TO-TOR' }
  const r = cerca(qi('mattoni vicino a Torino'), { ...dati, riferimento: rif })
  assert.equal(r.riferimento.nome, 'Torino')
})

console.log(`${ok} casi superati${process.exitCode ? ', alcuni falliti' : ''}`)
