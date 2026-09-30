// Stile MapLibre "Cantiere pulito": globo asfalto su pagina cemento.
// Tile vettoriali OpenFreeMap (schema OpenMapTiles), senza chiavi né sprite.
import type { ProjectionSpecification, StyleSpecification } from 'maplibre-gl'

export const COLORI = {
  cemento: '#EDEBE6',
  asfalto: '#1C1C1A',
  // terra un filo più chiara e mare più scuro: la costa si legge anche sul globo
  terra: '#262623',
  mare: '#0B0B0A',
  edifici: '#32322E',
  giallo: '#FFC21A',
}

/** globo fino a zoom 6, Mercator da 8: la proiezione dell'intro e del volo */
export const PROIEZIONE_GLOBO: ProjectionSpecification = {
  type: ['interpolate', ['linear'], ['zoom'], 6, 'vertical-perspective', 8, 'mercator'],
}

const nome: ['coalesce', ['get', string], ['get', string]] = ['coalesce', ['get', 'name:it'], ['get', 'name']]

export function creaStile(): StyleSpecification {
  return {
    version: 8,
    // globo per l'intro (zoom ≤ 6), Mercator nelle zone: il preset "globe" resterebbe sferico fino a zoom 10-12,
    // proprio dove stanno le viste di zona, e le misure a schermo non tornerebbero
    projection: PROIEZIONE_GLOBO,
    sky: { 'atmosphere-blend': 0 },
    // "t" = tempo delle pulsazioni, "anima" = 0 con reduced-motion, "crescita" = colonne 0→1,
    // "accensione" = anello del lotto appena pubblicato 0→1
    state: { t: { default: 0 }, anima: { default: 1 }, crescita: { default: 1 }, accensione: { default: 1 } },
    glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
    sources: {
      omt: {
        type: 'vector',
        url: 'https://tiles.openfreemap.org/planet',
        attribution:
          '<a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> © <a href="https://www.openmaptiles.org/" target="_blank" rel="noopener">OpenMapTiles</a> © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
      },
    },
    layers: [
      { id: 'terra', type: 'background', paint: { 'background-color': COLORI.terra } },
      {
        // linea di costa: il contorno del riempimento (1 px, cemento al 30%). Un layer di linee sugli stessi
        // poligoni supererebbe il limite di 65.535 vertici con gli oceani a zoom basso.
        id: 'acqua',
        type: 'fill',
        source: 'omt',
        'source-layer': 'water',
        paint: { 'fill-color': COLORI.mare, 'fill-outline-color': 'rgba(237, 235, 230, 0.3)' },
      },
      {
        id: 'confini',
        type: 'line',
        source: 'omt',
        'source-layer': 'boundary',
        filter: ['all', ['==', ['get', 'admin_level'], 2], ['!=', ['get', 'maritime'], 1]],
        paint: {
          'line-color': COLORI.cemento,
          'line-opacity': ['interpolate', ['linear'], ['zoom'], 1, 0.18, 6, 0.3],
          'line-width': ['interpolate', ['linear'], ['zoom'], 1, 0.5, 6, 1],
        },
      },
      {
        id: 'edifici',
        type: 'fill',
        source: 'omt',
        'source-layer': 'building',
        minzoom: 13,
        paint: { 'fill-color': COLORI.edifici },
      },
      {
        id: 'strade-minori',
        type: 'line',
        source: 'omt',
        'source-layer': 'transportation',
        minzoom: 11,
        filter: ['in', ['get', 'class'], ['literal', ['minor', 'service', 'tertiary']]],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': COLORI.cemento,
          'line-opacity': 0.14,
          'line-width': ['interpolate', ['exponential', 1.5], ['zoom'], 11, 0.5, 16, 3],
        },
      },
      {
        id: 'strade-principali',
        type: 'line',
        source: 'omt',
        'source-layer': 'transportation',
        minzoom: 7,
        filter: ['in', ['get', 'class'], ['literal', ['motorway', 'trunk', 'primary', 'secondary']]],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': COLORI.cemento,
          'line-opacity': ['interpolate', ['linear'], ['zoom'], 7, 0.12, 12, 0.3],
          'line-width': ['interpolate', ['exponential', 1.5], ['zoom'], 7, 0.5, 16, 5],
        },
      },
      {
        id: 'etichette-strade',
        type: 'symbol',
        source: 'omt',
        'source-layer': 'transportation_name',
        minzoom: 14,
        layout: {
          'symbol-placement': 'line',
          'text-field': nome,
          'text-font': ['Noto Sans Regular'],
          'text-size': 11,
        },
        paint: { 'text-color': COLORI.cemento, 'text-opacity': 0.55, 'text-halo-color': COLORI.asfalto, 'text-halo-width': 1.5 },
      },
      {
        id: 'etichette-luoghi',
        type: 'symbol',
        source: 'omt',
        'source-layer': 'place',
        minzoom: 5,
        filter: ['in', ['get', 'class'], ['literal', ['city', 'town', 'village']]],
        layout: {
          'text-field': nome,
          'text-font': ['Noto Sans Bold'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 5, 11, 12, 15],
          'text-letter-spacing': 0.02,
        },
        paint: { 'text-color': COLORI.cemento, 'text-opacity': 0.8, 'text-halo-color': COLORI.asfalto, 'text-halo-width': 2 },
      },
    ],
  }
}
