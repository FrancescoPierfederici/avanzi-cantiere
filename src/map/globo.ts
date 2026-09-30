// Geometria del globo dell'intro: sfera intera sotto titolo e ricerca, con margine in fondo
// e l'Italia al centro. Nessun import di MapLibre: la usano anche la Home e il globo statico.
//
// Il globo statico deve coincidere con quello di MapLibre ("vertical-perspective"), che usa
// una camera prospettica a distanza finita: il bordo che si vede è più piccolo della sfera.
// Distanza camera–superficie f = 0,5·H / tan(fov/2), fov = 36,87° → f = 1,5·H.

export const LNG_ITALIA = 12.5
export const LAT_ITALIA = 42.3
/** ampiezza dell'oscillazione attorno all'Italia, gradi di longitudine */
export const OSCILLAZIONE_GRADI = 25
/** durata di un'oscillazione completa (andata e ritorno), secondi */
export const OSCILLAZIONE_PERIODO_S = 40
/** spazio libero sotto il globo, px */
export const MARGINE_SOTTO = 56

const TAN_MEZZO_FOV = Math.tan(0.6435011087932844 / 2)

export interface Globo {
  larghezza: number
  altezza: number
  /** raggio della sfera in px, da cui lo zoom */
  raggioSfera: number
  /** raggio del bordo apparente, quello che si vede */
  raggio: number
  /** distanza camera–superficie in px */
  focale: number
  cx: number
  cy: number
  paddingTop: number
  paddingBottom: number
  zoom: number
}

/**
 * @param topLibero y (dall'alto della zona mappa) da cui il globo può iniziare, sotto titolo e ricerca
 */
export function calcolaGlobo(larghezza: number, altezza: number, topLibero: number): Globo {
  const libera = Math.max(200, altezza - topLibero - MARGINE_SOTTO)
  // stessa misura della versione a sfera intera: zoom da 86% del lato libero più corto
  const base = (0.86 * Math.min(larghezza, libera)) / 2
  const zoom = Math.max(0.3, Math.log2((2 * Math.PI * base) / 512))
  // MapLibre ingrandisce la sfera di 1/cos(lat del centro), perché al centro la scala
  // coincida con Mercator: con l'Italia al centro (42°) il globo è ~1,35 volte più grande
  const raggioSfera = (512 * 2 ** zoom) / (2 * Math.PI * Math.cos((LAT_ITALIA * Math.PI) / 180))
  const focale = (0.5 * altezza) / TAN_MEZZO_FOV
  const raggio = raggioSfera / Math.sqrt(1 + (2 * raggioSfera) / focale)
  // il centro sta a metà dello spazio libero tra topLibero e il margine in fondo
  const paddingTop = topLibero
  const paddingBottom = MARGINE_SOTTO
  const cy = paddingTop + (altezza - paddingTop - paddingBottom) / 2
  return { larghezza, altezza, raggioSfera, raggio, focale, cx: larghezza / 2, cy, paddingTop, paddingBottom, zoom }
}

/** Proiezione prospettica (come MapLibre) di [lng, lat] con l'Italia al centro; null se sul retro. */
export function proietta([lng, lat]: [number, number], g: Globo): [number, number] | null {
  const r = Math.PI / 180
  const f = lat * r
  const f0 = LAT_ITALIA * r
  const dl = (lng - LNG_ITALIA) * r
  const X = Math.cos(f) * Math.sin(dl)
  const Y = Math.cos(f0) * Math.sin(f) - Math.sin(f0) * Math.cos(f) * Math.cos(dl)
  const Z = Math.sin(f0) * Math.sin(f) + Math.cos(f0) * Math.cos(f) * Math.cos(dl)
  const R = g.raggioSfera
  const L = R + g.focale
  if (Z <= R / L) return null
  const k = (g.focale * R) / (L - R * Z)
  return [g.cx + k * X, g.cy - k * Y]
}
