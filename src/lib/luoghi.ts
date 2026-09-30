// Lettura dell'elenco dei comuni italiani (GeoNames, CC BY 4.0) e delle frazioni della zona demo.
// Funzione pura: la usano il browser (caricaLuoghi.ts) e il test del parser, che legge il file dal disco.

import type { Luogo } from '../data/types.ts'

export function parseLuoghi(testo: string): Luogo[] {
  const out: Luogo[] = []
  let frazioni = false
  for (const riga of testo.split('\n')) {
    if (!riga) continue
    if (riga === '#frazioni') {
      frazioni = true
      continue
    }
    const c = riga.split('|')
    const nomi = c[0].split('/')
    if (frazioni) {
      out.push({ nome: nomi[0], nomi, lat: Number(c[1]), lng: Number(c[2]), fascia: 0, entroterra: null, frazione: true })
    } else {
      out.push({
        nome: nomi[0],
        nomi,
        lat: Number(c[1]),
        lng: Number(c[2]),
        provincia: c[3],
        sigla: c[4],
        fascia: Number(c[5]),
        entroterra: c[6] === '-' ? null : Number(c[6]) * 10,
        appigli: c[7]
          ? c[7].split(',').map((x) => {
              const [dlat, dlng] = x.split(':').map(Number)
              return [Number(c[1]) + dlat / 1000, Number(c[2]) + dlng / 1000] as [number, number]
            })
          : undefined,
      })
    }
  }
  return out
}
