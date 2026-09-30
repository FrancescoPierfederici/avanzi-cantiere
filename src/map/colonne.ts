// Colonne 3D gialle per i lotti trovati (fill-extrusion) + punti piatti per gli altri lotti della zona.
import type { Feature, FeatureCollection, Polygon } from 'geojson'
import type { ExpressionSpecification, Map as MapLibre } from 'maplibre-gl'
import type { Azienda, Lotto } from '../data/types'
import { COLORI } from './stile'

export const SORGENTE_COLONNE = 'colonne'
export const SORGENTE_ALTRI = 'lotti-zona'

interface Voce {
  lotto: Lotto
  azienda: Azienda
}

// Spirale di posizioni attorno alla sede: più lotti della stessa azienda non si sovrappongono.
const SPIRALE: [number, number][] = [
  [0, 0], [1, 0], [0, 1], [-1, 0], [0, -1], [1, 1], [-1, 1], [-1, -1], [1, -1],
  [2, 0], [0, 2], [-2, 0], [0, -2], [2, 1], [1, 2], [-1, 2], [-2, 1], [-2, -1], [-1, -2], [1, -2], [2, -1],
]

// Misure reali in metri: impronta 120 m, altezza da 80 a 350 m in base al peso.
// Il passo lascia 70 m tra colonne vicine della stessa azienda: non si toccano.
// Valgono per le viste vicine (zoom ≥ 12,5); se l'inquadratura si allarga per contenere
// risultati lontani, tutto viene ingrandito in proporzione (`scala`), così a schermo le colonne
// restano grandi come da vicino invece di ridursi a un pixel.
const LATO_M = 120
const PASSO_M = 190
const ALTEZZA_MIN_M = 80
const ALTEZZA_MAX_M = 350

function quadrato(lng: number, lat: number, dxM: number, dyM: number, latoM: number): Polygon {
  const mLat = 1 / 110_574
  const mLng = 1 / (111_320 * Math.cos((lat * Math.PI) / 180))
  const cx = lng + dxM * mLng
  const cy = lat + dyM * mLat
  const h = latoM / 2
  const ring: [number, number][] = [
    [cx - h * mLng, cy - h * mLat],
    [cx + h * mLng, cy - h * mLat],
    [cx + h * mLng, cy + h * mLat],
    [cx - h * mLng, cy + h * mLat],
    [cx - h * mLng, cy - h * mLat],
  ]
  return { type: 'Polygon', coordinates: [ring] }
}

/**
 * Altezza ∝ peso stimato: m², pezzi e bancali non si confrontano tra loro, i kg sì.
 */
export function colonneGeoJSON(trovati: Voce[], pesoMax: number, scala = 1, inMappa?: Set<string>): FeatureCollection {
  const perAzienda = new Map<string, number>()
  const features = trovati.map(({ lotto, azienda }): Feature => {
    const k = perAzienda.get(azienda.id) ?? 0
    perAzienda.set(azienda.id, k + 1)
    const [sx, sy] = SPIRALE[k % SPIRALE.length]
    const altezza = (ALTEZZA_MIN_M + (ALTEZZA_MAX_M - ALTEZZA_MIN_M) * (lotto.pesoKg / pesoMax)) * scala
    return {
      type: 'Feature',
      geometry: quadrato(azienda.lng, azienda.lat, sx * PASSO_M * scala, sy * PASSO_M * scala, LATO_M * scala),
      // inMappa = risultato inquadrato (giallo pieno); gli altri (lontani, simili) sono tenui
      properties: { id: lotto.id, altezza, inMappa: !inMappa || inMappa.has(lotto.id) },
    }
  })
  return { type: 'FeatureCollection', features }
}

export function altriGeoJSON(altri: Voce[]): FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: altri.map(({ lotto, azienda }) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [azienda.lng, azienda.lat] },
      properties: { id: lotto.id },
    })),
  }
}

/** `sotto`: id del primo layer di etichette, così i nomi dei comuni restano sopra le colonne. */
export function aggiungiColonne(map: MapLibre, sotto?: string) {
  const vuoto: FeatureCollection = { type: 'FeatureCollection', features: [] }
  map.addSource(SORGENTE_ALTRI, { type: 'geojson', data: vuoto })
  map.addSource(SORGENTE_COLONNE, { type: 'geojson', data: vuoto, promoteId: 'id' })

  map.addLayer({
    id: 'lotti-zona',
    type: 'circle',
    source: SORGENTE_ALTRI,
    minzoom: 7,
    paint: {
      'circle-color': COLORI.asfalto,
      'circle-stroke-color': COLORI.giallo,
      'circle-stroke-width': 1.5,
      'circle-stroke-opacity': 0.55,
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 7, 2, 13, 4.5],
      'circle-pitch-alignment': 'map',
    },
  }, sotto)
  // l'opacità delle estrusioni non è per singola colonna: due layer sulla stessa sorgente
  const colore: ExpressionSpecification = ['case', ['boolean', ['feature-state', 'evidenziato'], false], COLORI.cemento, COLORI.giallo]
  const altezza: ExpressionSpecification = ['*', ['get', 'altezza'], ['global-state', 'crescita']]
  map.addLayer({
    id: 'colonne-tenui',
    type: 'fill-extrusion',
    source: SORGENTE_COLONNE,
    filter: ['!', ['get', 'inMappa']],
    paint: {
      'fill-extrusion-color': colore,
      'fill-extrusion-height': altezza,
      'fill-extrusion-base': 0,
      'fill-extrusion-opacity': 0.3,
    },
  }, sotto)
  map.addLayer({
    id: 'colonne',
    type: 'fill-extrusion',
    source: SORGENTE_COLONNE,
    filter: ['get', 'inMappa'],
    paint: {
      'fill-extrusion-color': colore,
      'fill-extrusion-height': altezza,
      'fill-extrusion-base': 0,
      'fill-extrusion-opacity': 0.95,
      'fill-extrusion-vertical-gradient': true,
    },
  }, sotto)
}
