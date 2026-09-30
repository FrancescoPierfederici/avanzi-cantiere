// Wrapper React della mappa, caricato in lazy: MapLibre arriva in un chunk separato.
import { useEffect, useRef } from 'react'
import { puntiItalia } from '../../data'
import { aziendaDi, lottiAttivi, useArchivio } from '../../lib/archivio'
import { ControlloreMappa } from '../../map/controllore'

type Props = {
  riduci: boolean
  cooperativa: boolean
  className?: string
  onPronta: (c: ControlloreMappa) => void
  onClickLotto: (id: string) => void
  /** le tile tardano ad arrivare (oltre 0,6 s dopo la fine del movimento): la mappa è scura e vuota */
  onAttesaTile?: (attesa: boolean) => void
}

export default function Mappa({ riduci, cooperativa, className = '', onPronta, onClickLotto, onAttesaTile }: Props) {
  const div = useRef<HTMLDivElement>(null)
  const ctrl = useRef<ControlloreMappa | null>(null)
  // i callback cambiano a ogni render: li leggo sempre dall'ultimo valore
  const cb = useRef({ onPronta, onClickLotto, onAttesaTile })
  cb.current = { onPronta, onClickLotto, onAttesaTile }

  useEffect(() => {
    const c = new ControlloreMappa({
      container: div.current!,
      riduci,
      cooperativa,
      decorativi: puntiItalia,
      lotti: lottiAttivi(),
      aziendaDi: (l) => aziendaDi(l),
      onClickLotto: (id) => cb.current.onClickLotto(id),
      onPronta: () => cb.current.onPronta(c),
    })
    ctrl.current = c
    return () => {
      c.distruggi()
      ctrl.current = null
    }
    // la mappa si crea una volta sola; riduci e cooperativa vengono letti al montaggio
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    ctrl.current?.setRiduci(riduci)
  }, [riduci])

  // lotti pubblicati o prenotati (anche da un'altra finestra): i punti sul globo si aggiornano
  const archivio = useArchivio()
  useEffect(() => {
    ctrl.current?.aggiornaPunti(lottiAttivi(archivio))
  }, [archivio])

  // tile in ritardo: si segnala solo oltre 0,6 s, per non far lampeggiare l'indicatore a ogni spostamento
  useEffect(() => {
    let da = 0
    let ultimo = false
    const t = window.setInterval(() => {
      const attesa = !!ctrl.current?.inAttesaDiTile()
      if (!attesa) da = 0
      else if (!da) da = Date.now()
      const ora = attesa && Date.now() - da > 600
      if (ora !== ultimo) cb.current.onAttesaTile?.((ultimo = ora))
    }, 250)
    return () => window.clearInterval(t)
  }, [])

  return <div ref={div} role="region" aria-label="Mappa dei lotti" className={className} />
}
