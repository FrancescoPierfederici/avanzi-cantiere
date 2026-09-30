import { useEffect, useRef } from 'react'
import { Testata } from '../components/app/Testata'
import { DemoBanner } from '../components/ui/DemoBanner'
import { Link } from '../router'

/** Pagina 404: qualsiasi percorso che non corrisponde a una rotta dell'app. */
export function NonTrovata({ path }: { path: string }) {
  const titoloRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    document.title = 'Pagina non trovata – Avanzi'
    titoloRef.current?.focus({ preventScroll: true })
    return () => {
      document.title = 'Avanzi – materiale edile nuovo avanzato'
    }
  }, [])

  return (
    <>
      <DemoBanner />
      <Testata larghezza="max-w-[900px]" />
      <main className="mx-auto max-w-[900px] px-4 pt-10 pb-28 sm:px-8 lg:pb-16">
        <p aria-hidden="true" className="stencil num text-[88px] leading-none font-bold tracking-tight text-asfalto-2 sm:text-[120px]">
          404
        </p>
        <h1 ref={titoloRef} tabIndex={-1} className="mt-4 text-[30px] leading-tight font-extrabold font-wide outline-none sm:text-[36px]">
          Pagina non trovata
        </h1>
        <p className="mt-3 max-w-[60ch] text-[17px] text-asfalto-2">
          L'indirizzo <span className="num font-semibold break-all text-asfalto">{path}</span> non porta a nessuna pagina della demo. Forse il link è
          incompleto o è stato scritto a mano.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/" className="inline-flex min-h-12 items-center rounded-etichetta border-2 border-asfalto bg-giallo px-5 font-display text-[15px] font-bold font-semiwide">
            Cerca materiale
          </Link>
          <Link to="/pubblica" className="inline-flex min-h-12 items-center rounded-etichetta border-2 border-asfalto px-5 font-display text-[15px] font-bold font-semiwide hover:bg-cemento-2">
            Pubblica un lotto
          </Link>
        </div>
      </main>
    </>
  )
}
