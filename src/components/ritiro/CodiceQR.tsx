// QR del codice di ritiro. Caricato in lazy: qrcode-generator arriva solo qui.
import qrcode from 'qrcode-generator'
import { useMemo } from 'react'

type Props = {
  /** testo codificato nel QR */
  valore: string
  /** descrizione per gli screen reader */
  etichetta: string
  className?: string
}

export default function CodiceQR({ valore, etichetta, className = '' }: Props) {
  // un solo tracciato con tutti i moduli scuri: leggero da disegnare, nitido a ogni misura
  const { d, lato } = useMemo(() => {
    const qr = qrcode(0, 'M')
    qr.addData(valore)
    qr.make()
    const n = qr.getModuleCount()
    let d = ''
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c + 4} ${r + 4}h1v1h-1z`
    return { d, lato: n + 8 } // 4 moduli di margine bianco per lato, come vuole lo standard
  }, [valore])

  return (
    <svg role="img" aria-label={etichetta} viewBox={`0 0 ${lato} ${lato}`} shapeRendering="crispEdges" className={`bg-white ${className}`}>
      <path d={d} fill="#1C1C1A" />
    </svg>
  )
}
