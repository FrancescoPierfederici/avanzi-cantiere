import { useMemo } from 'react'
import { puntiItalia } from '../../data'
import { aziendaDi, lottiAttivi } from '../../lib/archivio'
import { proietta, type Globo } from '../../map/globo'

type Props = {
  geo: Globo
  visibile: boolean
}

/**
 * Immagine statica del globo, stessa geometria e stessi colori della mappa:
 * copre il caricamento di MapLibre e poi sfuma quando la mappa vera è pronta.
 */
export function GloboStatico({ geo, visibile }: Props) {
  const punti = useMemo(() => {
    const sedi = new Map(lottiAttivi().map((l) => {
      const a = aziendaDi(l)
      return [a.id, [a.lng, a.lat] as [number, number]] as const
    }))
    const tutti: [number, number][] = [...puntiItalia, ...sedi.values()]
    return tutti.map((p) => proietta(p, geo)).filter((p): p is [number, number] => p !== null)
  }, [geo])

  return (
    <svg
      aria-hidden="true"
      width={geo.larghezza}
      height={geo.altezza}
      viewBox={`0 0 ${geo.larghezza} ${geo.altezza}`}
      className={`pointer-events-none absolute inset-x-0 top-0 transition-opacity duration-700 ${visibile ? 'opacity-100' : 'opacity-0'}`}
    >
      {/* media tra terra (#262623) e mare (#0B0B0A): la dissolvenza verso la mappa non salta */}
      <circle cx={geo.cx} cy={geo.cy} r={geo.raggio} fill="#191917" />
      <g fill="#FFC21A">
        {punti.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={1.4} opacity={0.85} />
        ))}
      </g>
    </svg>
  )
}
