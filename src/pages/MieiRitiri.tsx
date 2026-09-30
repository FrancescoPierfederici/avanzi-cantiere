import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { Azzera } from '../components/app/Azzera'
import { Testata } from '../components/app/Testata'
import { DemoBanner } from '../components/ui/DemoBanner'
import { KgCounter } from '../components/ui/KgCounter'
import { annullaPrenotazione, kgSalvatiDaTe, useArchivio, type Prenotazione } from '../lib/archivio'
import { etichettaUnita, formatDataLunga, formatEuro, formatNumero } from '../lib/format'
import { urlLotto } from '../lib/navigazione'
import { testoQR } from '../lib/ritiri'
import { Link } from '../router'

const CodiceQR = lazy(() => import('../components/ritiro/CodiceQR'))

export function MieiRitiri() {
  const archivio = useArchivio()
  const titoloRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    document.title = 'I miei ritiri – Avanzi'
    // arrivando da "Azzera i dati della demo" il focus resta su quel pulsante
    if (window.location.hash !== '#azzera') titoloRef.current?.focus({ preventScroll: true })
  }, [])

  return (
    <>
      <DemoBanner />
      <Testata larghezza="max-w-[900px]" />
      <main className="mx-auto max-w-[900px] px-4 pt-5 pb-28 sm:px-8 lg:pb-16">
        <h1 ref={titoloRef} tabIndex={-1} className="text-[30px] leading-tight font-extrabold font-wide outline-none sm:text-[36px]">
          I miei ritiri
        </h1>
        <div className="mt-4">
          <h2 className="font-sans text-[15px] font-normal text-asfalto-2">I tuoi kg salvati dalla discarica</h2>
          <KgCounter kg={kgSalvatiDaTe(archivio)} taglia="riga" etichetta="salvati dalla discarica" className="mt-2" />
        </div>

        {archivio.prenotazioni.length === 0 ? (
          <div className="mt-8 rounded-etichetta border-2 border-dashed border-asfalto bg-carta p-5">
            <p className="text-[17px]">Non hai ancora prenotato ritiri.</p>
            <p className="mt-1 text-[15px] text-asfalto-2">Trova un lotto, apri la scheda e premi «Prenota il ritiro».</p>
            <Link to="/" className="mt-4 inline-flex min-h-12 items-center rounded-etichetta border-2 border-asfalto bg-giallo px-5 font-display text-[15px] font-bold font-semiwide">
              Cerca materiale
            </Link>
          </div>
        ) : (
          <ul className="mt-8 grid gap-6">
            {archivio.prenotazioni.map((p) => (
              <li key={p.codice}>
                <Ritiro p={p} />
              </li>
            ))}
          </ul>
        )}
        <Azzera />
      </main>
    </>
  )
}

function Ritiro({ p }: { p: Prenotazione }) {
  const [conferma, setConferma] = useState(false)
  return (
    <article aria-labelledby={`r-${p.codice}`} className="rounded-etichetta border-2 border-dashed border-asfalto bg-carta p-5 sm:flex sm:gap-6">
      <div className="mx-auto w-full max-w-[200px] shrink-0 sm:mx-0">
        <Suspense fallback={<div className="aspect-square bg-cemento-2" />}>
          <CodiceQR valore={testoQR(p.codice, p.lottoCodice, p.giorno, p.fascia)} etichetta={`QR del ritiro ${p.codice}`} className="w-full rounded-[2px] border-2 border-asfalto" />
        </Suspense>
      </div>
      <div className="mt-4 min-w-0 flex-1 sm:mt-0">
        <h2 id={`r-${p.codice}`} className="num text-[26px] leading-none font-bold tracking-tight">
          {p.codice}
        </h2>
        <p className="mt-2 font-display text-[18px] leading-tight font-bold font-semiwide">
          <Link to={urlLotto(p.lottoCodice)} className="underline decoration-2 underline-offset-4">
            {p.titolo}
          </Link>
        </p>
        <dl className="mt-3 grid gap-x-6 gap-y-2 text-[15px] sm:grid-cols-2">
          <div>
            <dt className="text-[13px] text-asfalto-2">Quando</dt>
            <dd className="font-semibold">
              {formatDataLunga(p.giorno)}, <span className="num">{p.fascia}</span>
            </dd>
          </div>
          <div>
            <dt className="text-[13px] text-asfalto-2">Dove</dt>
            <dd className="font-semibold">
              {p.sede.nome}, {p.sede.indirizzo}
            </dd>
          </div>
          <div>
            <dt className="text-[13px] text-asfalto-2">Quantità</dt>
            <dd className="num font-semibold">
              {formatNumero(p.quantita)} {etichettaUnita(p.quantita, p.unita)}
            </dd>
          </div>
          <div>
            <dt className="text-[13px] text-asfalto-2">Totale</dt>
            <dd className="font-semibold">
              <span className="num">{formatEuro(p.totale)}</span> · {p.pagamento === 'al-ritiro' ? 'al ritiro' : 'pagato (simulato)'}
            </dd>
          </div>
        </dl>
        <div className="mt-4">
          {conferma ? (
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => annullaPrenotazione(p.codice)} className="min-h-12 rounded-etichetta border-2 border-asfalto bg-asfalto px-4 font-display text-[15px] font-bold font-semiwide text-cemento">
                Sì, annulla il ritiro
              </button>
              <button type="button" onClick={() => setConferma(false)} className="min-h-12 rounded-etichetta border-2 border-asfalto px-4 font-display text-[15px] font-bold font-semiwide">
                No, tienilo
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => setConferma(true)} className="min-h-12 rounded-etichetta border-2 border-asfalto px-4 font-display text-[15px] font-bold font-semiwide hover:bg-asfalto/8">
              Annulla prenotazione
            </button>
          )}
        </div>
      </div>
    </article>
  )
}
