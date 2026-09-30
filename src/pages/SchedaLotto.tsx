import { lazy, Suspense, useEffect, useMemo, useRef } from 'react'
import { Button } from '../components/ui/Button'
import { DemoBanner } from '../components/ui/DemoBanner'
import { DistanceBadge } from '../components/ui/DistanceBadge'
import { FotoLotto } from '../components/ui/FotoLotto'
import { IconaRitiro } from '../components/ui/icone'
import { KgCounter } from '../components/ui/KgCounter'
import { LotCard, TIPO_AZIENDA } from '../components/ui/LotCard'
import { Testata } from '../components/app/Testata'
import { comuni, nomeComune } from '../data'
import { aziendaDi, lottiAttivi, lottiDellaZona } from '../lib/archivio'
import { riferimentoZona } from '../lib/zone'
import { useLottoDaCodice } from '../hooks/useLottoDaCodice'
import { fotoMostrata } from '../lib/foto'
import type { Lotto } from '../data/types'
import { useRiduciMovimento } from '../hooks/useRiduciMovimento'
import { useVisibile } from '../hooks/useVisibile'
import {
  etichettaUnita, formatDataLunga, formatEuro, formatKg, formatNumero, perUnita, risparmioTotale, scontoPercento,
} from '../lib/format'
import { distanzaKm } from '../lib/geo'
import { memoria } from '../lib/memoria'
import { tornaAiRisultati, urlLotto } from '../lib/navigazione'
import { Link, navigate } from '../router'

const Bancale3D = lazy(() => import('../components/bancale/Bancale3D'))
const MiniMappa = lazy(() => import('../components/scheda/MiniMappa'))

const N_SIMILI = 4

function Intestazione() {
  return (
    <Testata
      destra={
      <Link
        to={tornaAiRisultati()}
        className="inline-flex min-h-12 items-center gap-2 rounded-etichetta border-2 border-asfalto px-4 font-display text-[15px] font-bold font-semiwide hover:bg-asfalto/8"
      >
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M15 5l-7 7 7 7" />
        </svg>
        Torna ai risultati
      </Link>
      }
    />
  )
}

/** Tacca semicircolare sulla linea di strappo, come nella card. */
function Tacca({ lato }: { lato: 'sx' | 'dx' }) {
  return (
    <span
      aria-hidden="true"
      className={`absolute top-0 size-5 -translate-y-1/2 rounded-full border-2 border-dashed border-asfalto bg-cemento ${lato === 'sx' ? '-left-[11px]' : '-right-[11px]'}`}
      style={{ clipPath: lato === 'sx' ? 'inset(0 0 0 50%)' : 'inset(0 50% 0 0)' }}
    />
  )
}

function Segnaposto({ testo, className = '' }: { testo: string; className?: string }) {
  return <div className={`grid place-items-center bg-cemento-2 text-[14px] text-asfalto-2 ${className}`}>{testo}</div>
}

export function SchedaLotto({ codice }: { codice: string }) {
  // dall'archivio: anche i lotti pubblicati da te, con la quantità rimasta dopo le prenotazioni
  // (le città generate si rigenerano al volo anche da un link diretto)
  const { lotto: grezzo, attesa } = useLottoDaCodice(codice)
  // aperta da una card dei risultati: la stessa foto che si vedeva nella lista
  const lotto = useMemo(() => grezzo && { ...grezzo, foto: fotoMostrata(grezzo) }, [grezzo])
  const titoloRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    if (attesa) {
      document.title = 'Carico il lotto… – Avanzi'
      return
    }
    document.title = lotto ? `${lotto.codice} · ${lotto.titolo} – Avanzi` : 'Lotto non trovato – Avanzi'
    titoloRef.current?.focus({ preventScroll: true })
    return () => {
      document.title = 'Avanzi – materiale edile nuovo avanzato'
    }
  }, [lotto, attesa])

  return (
    <>
      <DemoBanner />
      <Intestazione />
      <main id="contenuto" className="mx-auto max-w-[1200px] px-4 pt-4 pb-28 sm:px-8 sm:pt-6 lg:pb-20">
        {attesa ? (
          <p role="status" className="py-10 text-[17px] font-semibold">
            Carico il lotto <span className="num">{codice}</span>…
          </p>
        ) : lotto ? (
          <Scheda lotto={lotto} titoloRef={titoloRef} />
        ) : (
          <div className="max-w-[60ch] py-10">
            <h1 ref={titoloRef} tabIndex={-1} className="text-[32px] leading-tight font-extrabold font-wide outline-none">
              Lotto non trovato
            </h1>
            <p className="mt-3 text-[17px] text-asfalto-2">
              Il codice <span className="num font-semibold text-asfalto">{codice}</span> non corrisponde a nessun lotto della demo. Forse è già
              stato ritirato, o il link è incompleto.
            </p>
            <Link to="/" className="mt-6 inline-flex min-h-12 items-center rounded-etichetta border-2 border-asfalto bg-giallo px-5 font-display text-[15px] font-bold font-semiwide">
              Cerca un altro lotto
            </Link>
          </div>
        )}
      </main>
    </>
  )
}

function Scheda({ lotto, titoloRef }: { lotto: Lotto; titoloRef: React.RefObject<HTMLHeadingElement | null> }) {
  const riduci = useRiduciMovimento()
  const azienda = aziendaDi(lotto)
  // città generata: distanze dal suo comune; zona demo: dall'ultima zona cercata
  const riferimento =
    riferimentoZona(azienda.comune) ?? comuni.find((c) => c.id === (memoria.zona(comuni.map((c) => c.id)) ?? 'senigallia'))!
  const km = distanzaKm(riferimento.lat, riferimento.lng, azienda.lat, azienda.lng)
  const comuneAzienda = nomeComune(azienda)
  const sconto = scontoPercento(lotto.prezzo, lotto.prezzoListino)
  const risparmio = risparmioTotale(lotto.prezzo, lotto.prezzoListino, lotto.quantita)
  const totale = Math.round(lotto.prezzo * lotto.quantita)
  const unita = etichettaUnita(lotto.quantita, lotto.unita)

  const bancaleRef = useRef<HTMLDivElement>(null)
  const mappaRef = useRef<HTMLDivElement>(null)
  const bancale = useVisibile(bancaleRef)
  const mappa = useVisibile(mappaRef)

  // simili: stessa categoria, i più vicini alla sede di questo lotto
  const simili = useMemo(
    () =>
      (riferimentoZona(azienda.comune) ? lottiDellaZona(azienda.comune) : lottiAttivi())
        .filter((l) => l.categoria === lotto.categoria && l.id !== lotto.id)
        .map((l) => {
          const a = aziendaDi(l)
          return { l, a, km: distanzaKm(azienda.lat, azienda.lng, a.lat, a.lng) }
        })
        .sort((x, y) => x.km - y.km)
        .slice(0, N_SIMILI),
    [lotto, azienda],
  )

  return (
    <>
      <div className="grid gap-8 lg:grid-cols-2 lg:gap-x-12">
        {/* foto */}
        <figure className="lg:col-start-1 lg:row-start-1">
          <div className="aspect-[4/3] overflow-hidden rounded-etichetta border-2 border-asfalto bg-cemento-2">
            <FotoLotto lotto={lotto} priorita />
          </div>
        </figure>

        {/* etichetta con i dati */}
        <section
          aria-labelledby="titolo-lotto"
          className="relative rounded-etichetta border-2 border-dashed border-asfalto bg-carta lg:col-start-2 lg:row-span-3 lg:row-start-1 lg:self-start"
        >
          <div className="flex items-baseline justify-between gap-3 border-b-2 border-asfalto px-5 pt-4 pb-3">
            <span className="num text-[17px] font-bold tracking-tight">{lotto.codice}</span>
            <span className="text-[14px] text-asfalto-2">{lotto.categoria}</span>
          </div>

          <div className="px-5 pt-5">
            <p className="num flex items-baseline gap-2.5 leading-[0.9]">
              <span className="text-[64px] font-bold tracking-[-0.045em] sm:text-[76px]">{formatNumero(lotto.quantita)}</span>
              <span className="text-[26px] font-semibold tracking-tight">{unita}</span>
            </p>
            <h1 id="titolo-lotto" ref={titoloRef} tabIndex={-1} className="mt-3 text-[26px] leading-[1.15] font-extrabold font-semiwide outline-none sm:text-[30px]">
              {lotto.titolo}
            </h1>
            <p className="mt-3 max-w-[60ch] text-[16px] leading-relaxed text-asfalto-2">{lotto.descrizione}</p>
          </div>

          <dl className="mx-5 mt-5 grid grid-cols-2 border-t-2 border-asfalto text-[15px]">
            <div className="col-span-2 border-b border-asfalto/25 py-2.5">
              <dt className="text-[13px] text-asfalto-2">Formato</dt>
              <dd className="num font-semibold">{lotto.formato}</dd>
            </div>
            <div className="border-r border-b border-asfalto/25 py-2.5 pr-3">
              <dt className="text-[13px] text-asfalto-2">Colore</dt>
              <dd className="font-semibold first-letter:uppercase">{lotto.colore}</dd>
            </div>
            <div className="border-b border-asfalto/25 py-2.5 pl-3">
              <dt className="text-[13px] text-asfalto-2">Peso stimato</dt>
              <dd className="num font-semibold">{formatKg(lotto.pesoKg)}</dd>
            </div>
            <div className="border-r border-asfalto/25 py-2.5 pr-3">
              <dt className="text-[13px] text-asfalto-2">Pubblicato il</dt>
              <dd className="font-semibold">
                <time dateTime={lotto.data}>{formatDataLunga(lotto.data)}</time>
              </dd>
            </div>
            <div className="py-2.5 pl-3">
              <dt className="text-[13px] text-asfalto-2">Distanza</dt>
              <dd className="mt-1">
                <DistanceBadge km={km} da={riferimento.nome} />
                <span aria-hidden="true" className="mt-1 block text-[13px] text-asfalto-2">
                  da {riferimento.nome}
                </span>
              </dd>
            </div>
          </dl>

          {/* prezzo: linea di strappo */}
          <div className="relative mt-5 border-t-2 border-dashed border-asfalto px-5 pt-5 pb-5">
            <Tacca lato="sx" />
            <Tacca lato="dx" />
            <h2 className="sr-only">Prezzo</h2>
            <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="num inline-flex items-baseline rounded-[2px] bg-giallo px-2.5 py-1.5 text-[32px] font-bold leading-none tracking-tight">
                {formatEuro(lotto.prezzo)}
                <span className="ml-1 text-[16px] font-semibold">{perUnita(lotto.unita)}</span>
              </span>
              <span className="text-[16px] text-asfalto-2">
                <span className="sr-only">invece di </span>
                <s className="num">{formatEuro(lotto.prezzoListino)}</s> di listino
                <span className="num ml-2 font-semibold text-asfalto">−{sconto}%</span>
              </span>
            </p>
            <p className="mt-4 text-[16px]">
              Tutto il lotto: <span className="num font-semibold">{formatEuro(totale)}</span>
            </p>
            <p className="mt-1 font-display text-[22px] leading-tight font-extrabold font-semiwide">
              Risparmi <span className="num">{formatEuro(risparmio)}</span> sul nuovo
            </p>
          </div>

          <div className="border-t border-asfalto/25 px-5 py-5">
            <KgCounter kg={lotto.pesoKg} taglia="riga" etichetta="in meno in discarica, se lo ritiri" />
          </div>

          {/* azienda */}
          <div className="border-t border-asfalto/25 px-5 py-5">
            <h2 className="font-sans text-[13px] font-normal text-asfalto-2">Chi lo vende</h2>
            <p className="mt-1 font-display text-[20px] leading-tight font-bold font-semiwide">{azienda.nome}</p>
            <p className="mt-1 text-[15px] text-asfalto-2">
              {TIPO_AZIENDA[azienda.tipo]} a {comuneAzienda}, {azienda.indirizzo.replace(`, ${comuneAzienda}`, '')}
            </p>
          </div>

          <div className="border-t-2 border-asfalto px-5 py-5">
            {lotto.quantita > 0 ? (
              <Button taglia="lg" icona={<IconaRitiro />} className="w-full" onClick={() => navigate(`${urlLotto(lotto.codice)}/ritiro`)}>
                Prenota il ritiro
              </Button>
            ) : (
              <p role="status" className="rounded-etichetta bg-asfalto px-4 py-3 text-[16px] font-semibold text-cemento">
                Prenotato per intero: questo lotto non è più disponibile.
              </p>
            )}
          </div>
        </section>

        {/* bancale 3D */}
        <section aria-labelledby="bancale-t" className="lg:col-start-1 lg:row-start-2">
          <h2 id="bancale-t" className="text-[22px] leading-tight font-extrabold font-wide">
            Il bancale
          </h2>
          <p className="mt-1 text-[15px] text-asfalto-2">Trascina in orizzontale per girarlo.</p>
          <div ref={bancaleRef} className="mt-3 rounded-etichetta border-2 border-asfalto bg-cemento-2 p-3">
            {bancale.vista ? (
              <Suspense fallback={<Segnaposto testo="Carico il bancale…" className="aspect-[4/3]" />}>
                <Bancale3D lotto={lotto} riduci={riduci} visibile={bancale.visibile} />
              </Suspense>
            ) : (
              <Segnaposto testo="Carico il bancale…" className="aspect-[4/3]" />
            )}
          </div>
        </section>

        {/* mini-mappa */}
        <section aria-labelledby="mappa-t" className="lg:col-start-1 lg:row-start-3">
          <h2 id="mappa-t" className="text-[22px] leading-tight font-extrabold font-wide">
            Dove si ritira
          </h2>
          <p className="mt-1 text-[15px] text-asfalto-2">{azienda.indirizzo}</p>
          <div ref={mappaRef} className="mt-3 aspect-[16/10] overflow-hidden rounded-etichetta border-2 border-asfalto bg-asfalto">
            {mappa.vista && (
              <Suspense fallback={null}>
                <MiniMappa lng={azienda.lng} lat={azienda.lat} nome={azienda.nome} />
              </Suspense>
            )}
          </div>
        </section>
      </div>

      {/* simili */}
      {simili.length > 0 && (
        <section aria-labelledby="simili-t" className="mt-16 border-t-2 border-asfalto pt-10">
          <h2 id="simili-t" className="text-[26px] leading-tight font-extrabold font-wide">
            Simili, vicino a questo
          </h2>
          <p className="mt-1 text-[15px] text-asfalto-2">Stessa categoria, dal più vicino alla sede di {azienda.nome}.</p>
          <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {simili.map(({ l, a, km: d }) => (
              <li key={l.id}>
                <LotCard lotto={l} azienda={a} distanzaKm={d} distanzaDa="questo lotto" className="h-full" />
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  )
}
