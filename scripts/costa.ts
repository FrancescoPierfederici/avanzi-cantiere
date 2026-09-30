// Linea di costa adriatica approssimata, da Gabicce a Porto Recanati.
// Il mare è a EST / NORD-EST: un punto è in mare se sta a destra (lng maggiore)
// della linea di costa alla sua latitudine.
//
// Tra Falconara e il Passetto la costa di Ancona fa un gomito (porto + promontorio
// del Duomo): lì la latitudine non è monotona e una semplice lngCosta(lat) sbaglierebbe.
// Per questo il lato mare è un poligono chiuso: la costa + un bordo lontano a est.
// Sui tratti rettilinei equivale esattamente a "lng > lngCosta(lat)".

type LatLng = [lat: number, lng: number]

export const COSTA: LatLng[] = [
  [43.968, 12.755], // Gabicce
  [43.952, 12.812], // San Bartolo
  [43.935, 12.862],
  [43.924, 12.892], // Baia Flaminia
  [43.918, 12.911], // Pesaro, piazzale della Libertà
  [43.914, 12.925],
  [43.900, 12.945],
  [43.875, 12.985],
  [43.848, 13.021], // Fano, Lido
  [43.815, 13.062],
  [43.790, 13.100],
  [43.768, 13.140], // Marotta
  [43.745, 13.175],
  [43.7205, 13.2215], // Senigallia, Rotonda
  [43.700, 13.260],
  [43.670, 13.320],
  [43.645, 13.365],
  [43.630, 13.395], // Falconara
  [43.618, 13.425],
  [43.610, 13.450], // Torrette
  [43.612, 13.480],
  [43.620, 13.495], // porto
  [43.627, 13.505],
  [43.626, 13.515], // promontorio del Duomo
  [43.620, 13.525],
  [43.613, 13.535], // Passetto
  [43.600, 13.560],
  [43.580, 13.590],
  [43.563, 13.600], // Portonovo
  [43.540, 13.612],
  [43.513, 13.625], // Numana
  [43.480, 13.640],
  [43.430, 13.665], // Porto Recanati
  [43.350, 13.720],
]

// Poligono "mare": costa (nord→sud) + chiusura lontana a est e a nord.
const MARE: LatLng[] = [...COSTA, [43.35, 14.8], [44.2, 14.8], [44.2, 12.755]]

function pointInPolygon([lat, lng]: LatLng, poly: LatLng[]): boolean {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [yi, xi] = poly[i]
    const [yj, xj] = poly[j]
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }
  return inside
}

export function isInMare(lat: number, lng: number): boolean {
  return pointInPolygon([lat, lng], MARE)
}

/** Distanza approssimata (km) dalla linea di costa. */
export function distanzaCostaKm(lat: number, lng: number): number {
  const kx = 111.32 * Math.cos((lat * Math.PI) / 180)
  const ky = 110.57
  let best = Infinity
  for (let i = 0; i < COSTA.length - 1; i++) {
    const ax = COSTA[i][1] * kx, ay = COSTA[i][0] * ky
    const bx = COSTA[i + 1][1] * kx, by = COSTA[i + 1][0] * ky
    const px = lng * kx, py = lat * ky
    const dx = bx - ax, dy = by - ay
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
    best = Math.min(best, Math.hypot(px - (ax + t * dx), py - (ay + t * dy)))
  }
  return best
}

// Punti di prova: se la costa è orientata male, la generazione si ferma.
const PROVE: [string, number, number, boolean][] = [
  ['Senigallia, centro storico', 43.715, 13.217, false],
  ['Senigallia, al largo', 43.73, 13.26, true],
  ['Ancona, piazza Cavour', 43.6167, 13.517, false],
  ['Ancona, al largo del porto', 43.65, 13.5, true],
  ['Pesaro, centro', 43.9098, 12.9131, false],
  ['Pesaro, al largo', 43.93, 12.95, true],
  ['Fano, centro', 43.8435, 13.017, false],
  ['Jesi (entroterra)', 43.5225, 13.2437, false],
]

export function verificaCosta(): void {
  for (const [nome, lat, lng, atteso] of PROVE) {
    const mare = isInMare(lat, lng)
    if (mare !== atteso) {
      throw new Error(`Costa errata: ${nome} (${lat}, ${lng}) → ${mare ? 'mare' : 'terra'}, atteso ${atteso ? 'mare' : 'terra'}`)
    }
  }
}
