// Punti gialli che si accendono (pubblicato) e si spengono (venduto) sul globo.
// Un solo valore globale "t" guida tutte le pulsazioni (400 decorativi + una sede per azienda): nessuno stile riscritto a ogni frame.
import type { Feature, FeatureCollection } from 'geojson'
import type { ExpressionSpecification, Map as MapLibre } from 'maplibre-gl'
import type { Azienda, Lotto, PuntoDecorativo } from '../data/types'
import { COLORI } from './stile'

export const SORGENTE_PUNTI = 'punti'
export const ZOOM_FINE_PUNTI = 10

/** Frazione pseudo-casuale stabile in [0,1) (sequenza di Weyl). */
const frazione = (i: number, k: number) => (((i + 1) * k) % 1 + 1) % 1

export function puntiGeoJSON(decorativi: PuntoDecorativo[], lotti: Lotto[], aziendaDi: (l: Lotto) => Azienda): FeatureCollection {
  const features: Feature[] = []
  decorativi.forEach((p, i) => {
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: p },
      properties: { lotto: 0, fase: frazione(i, 0.618034), periodo: 4 + 5 * frazione(i, 0.414214) },
    })
  })
  // un punto per sede: tanti lotti nella stessa azienda sommerebbero gli aloni in una macchia
  const sedi = new Map(lotti.map((l) => {
    const a = aziendaDi(l)
    return [a.id, a] as const
  }))
  ;[...sedi.values()].forEach((a, j) => {
    const i = decorativi.length + j
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [a.lng, a.lat] },
      properties: { lotto: 1, fase: frazione(i, 0.618034), periodo: 3.5 + 4 * frazione(i, 0.414214) },
    })
  })
  return { type: 'FeatureCollection', features }
}

// acceso ∈ [0,1]: seno sfasato per punto, tagliato e ammorbidito → lunghe fasi accese,
// brevi spegnimenti. Con "anima" = 0 il punto resta fisso a 0,85.
const acceso: ExpressionSpecification = [
  'case',
  ['==', ['global-state', 'anima'], 0],
  0.85,
  [
    'min',
    1,
    [
      'max',
      0,
      [
        '*',
        1.6,
        [
          '+',
          0.35,
          ['sin', ['*', 2, ['pi'], ['+', ['/', ['global-state', 't'], ['get', 'periodo']], ['get', 'fase']]]],
        ],
      ],
    ],
  ],
]

export function aggiungiPunti(map: MapLibre, dati: FeatureCollection, sotto?: string) {
  map.addSource(SORGENTE_PUNTI, { type: 'geojson', data: dati })
  const raggio = (base: number): ExpressionSpecification => [
    'interpolate', ['linear'], ['zoom'],
    1, ['*', base, ['case', ['==', ['get', 'lotto'], 1], 1.5, 1]],
    6, ['*', base * 3, ['case', ['==', ['get', 'lotto'], 1], 1.5, 1]],
  ]
  map.addLayer({
    id: 'punti-alone',
    type: 'circle',
    source: SORGENTE_PUNTI,
    maxzoom: ZOOM_FINE_PUNTI,
    paint: {
      'circle-color': COLORI.giallo,
      'circle-radius': raggio(2.2),
      'circle-blur': 1,
      'circle-opacity': ['*', 0.35, acceso],
    },
  }, sotto)
  map.addLayer({
    id: 'punti-nucleo',
    type: 'circle',
    source: SORGENTE_PUNTI,
    maxzoom: ZOOM_FINE_PUNTI,
    paint: {
      'circle-color': COLORI.giallo,
      'circle-radius': raggio(0.75),
      'circle-opacity': ['+', 0.12, ['*', 0.88, acceso]],
    },
  }, sotto)
}

/** Avvia il battito a ~20 aggiornamenti/s. Restituisce la funzione per fermarlo. */
export function avviaPulsazioni(map: MapLibre): () => void {
  let raf = 0
  let ultimo = 0
  const inizio = performance.now()
  const passo = (ora: number) => {
    raf = requestAnimationFrame(passo)
    if (ora - ultimo < 50 || document.hidden || map.getZoom() >= ZOOM_FINE_PUNTI) return
    ultimo = ora
    map.setGlobalStateProperty('t', (ora - inizio) / 1000)
  }
  raf = requestAnimationFrame(passo)
  return () => cancelAnimationFrame(raf)
}
