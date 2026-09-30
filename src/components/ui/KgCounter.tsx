import { useEffect, useRef, useState } from 'react'
import { formatNumero } from '../../lib/format'

type Props = {
  kg: number
  /** riga: numero e testo sulla stessa linea, per stare sotto una ricerca */
  taglia?: 'grande' | 'compatto' | 'riga'
  /** cosa conta il contatore: "rimessi in circolo" (globale) o "salvati dalla discarica" (tuoi) */
  etichetta?: string
  className?: string
}

const DURATA = 1600

function riduciMovimento() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Contatore dei kg ("rimessi in circolo", "salvati dalla discarica"…). Il verde vive SOLO qui,
 * sempre su asfalto: su cemento non raggiungerebbe il contrasto AA.
 */
export function KgCounter({ kg, taglia = 'grande', etichetta = 'rimessi in circolo', className = '' }: Props) {
  const statico = riduciMovimento()
  const [animato, setAnimato] = useState(0)
  const da = useRef(0)
  const mostrato = statico ? kg : animato

  useEffect(() => {
    if (statico) return
    const inizio = performance.now()
    const partenza = da.current
    let raf = 0
    const passo = (t: number) => {
      const p = Math.min(1, (t - inizio) / DURATA)
      const e = 1 - Math.pow(1 - p, 4) // ease-out
      const v = Math.round(partenza + (kg - partenza) * e)
      da.current = v
      setAnimato(v)
      if (p < 1) raf = requestAnimationFrame(passo)
    }
    raf = requestAnimationFrame(passo)
    return () => cancelAnimationFrame(raf)
  }, [kg, statico])

  const grande = taglia === 'grande'
  const cifre = formatNumero(kg).length

  if (taglia === 'riga') {
    return (
      <div className={`su-scuro inline-flex items-baseline gap-2.5 rounded-etichetta bg-asfalto px-4 py-2.5 text-cemento ${className}`}>
        <p className="sr-only">{formatNumero(kg)} chilogrammi di materiale {etichetta}</p>
        <span aria-hidden="true" className="num text-[24px] leading-none font-bold tracking-tight text-verde sm:text-[28px]" style={{ minWidth: `${cifre}ch` }}>
          {formatNumero(mostrato)}
          <span className="ml-1.5 text-[15px] font-semibold">kg</span>
        </span>
        <span aria-hidden="true" className="text-[14px] leading-none text-cemento/85">
          {etichetta}
        </span>
      </div>
    )
  }

  return (
    <div className={`su-scuro inline-flex flex-col rounded-etichetta bg-asfalto text-cemento ${grande ? 'gap-2 px-5 pt-4 pb-5' : 'gap-1 px-3.5 pt-2.5 pb-3'} ${className}`}>
      <p className="sr-only">{formatNumero(kg)} chilogrammi di materiale {etichetta}</p>
      <span
        aria-hidden="true"
        className={`num font-bold leading-none tracking-tight text-verde ${grande ? 'text-[44px] sm:text-[56px]' : 'text-[26px]'}`}
        style={{ minWidth: `${cifre}ch` }}
      >
        {formatNumero(mostrato)}
        <span className={`ml-2 font-semibold ${grande ? 'text-[22px] sm:text-[26px]' : 'text-[15px]'}`}>kg</span>
      </span>
      <span aria-hidden="true" className={`${grande ? 'text-[15px]' : 'text-[13px]'} leading-snug text-cemento/85`}>
        {etichetta}
      </span>
    </div>
  )
}
