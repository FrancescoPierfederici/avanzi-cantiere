import { useEffect, useRef, useState } from 'react'
import { azzeraDemo } from '../../lib/archivio'

/** "Azzera i dati della demo": due passaggi, per non cancellare per sbaglio prima di una presentazione. */
export function Azzera() {
  const [conferma, setConferma] = useState(false)
  const [fatto, setFatto] = useState(false)
  const bottone = useRef<HTMLButtonElement>(null)

  // arrivando dal link "Azzera i dati della demo" (#azzera) il pulsante è già in vista e ha il focus
  useEffect(() => {
    if (window.location.hash !== '#azzera') return
    bottone.current?.scrollIntoView({ block: 'center' })
    bottone.current?.focus({ preventScroll: true })
  }, [])

  return (
    <div id="azzera" className="mt-16 border-t border-asfalto/25 pt-6">
      <p className="text-[14px] text-asfalto-2">
        I lotti che pubblichi, gli avvisi e i ritiri restano solo in questo browser.
      </p>
      {fatto ? (
        <p role="status" className="mt-3 text-[15px] font-semibold">
          Dati della demo azzerati.
        </p>
      ) : conferma ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              azzeraDemo()
              setFatto(true)
            }}
            className="min-h-12 rounded-etichetta border-2 border-asfalto bg-asfalto px-4 font-display text-[15px] font-bold font-semiwide text-cemento"
          >
            Sì, cancella tutto
          </button>
          <button type="button" onClick={() => setConferma(false)} className="min-h-12 rounded-etichetta border-2 border-asfalto px-4 font-display text-[15px] font-bold font-semiwide">
            Annulla
          </button>
        </div>
      ) : (
        <button ref={bottone} type="button" onClick={() => setConferma(true)} className="mt-3 min-h-12 rounded-etichetta border-2 border-asfalto px-4 font-display text-[15px] font-bold font-semiwide hover:bg-asfalto/8">
          Azzera i dati della demo
        </button>
      )}
    </div>
  )
}
