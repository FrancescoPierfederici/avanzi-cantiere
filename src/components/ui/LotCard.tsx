import type { HTMLAttributes } from 'react'
import type { Azienda, Lotto } from '../../data/types'
import { nomeComune } from '../../data'
import {
  etichettaUnita, formatData, formatEuro, formatKg, formatNumero, perUnita, scontoPercento,
} from '../../lib/format'
import { urlLotto } from '../../lib/navigazione'
import { Link } from '../../router'
import { Barcode } from './Barcode'
import { DistanceBadge } from './DistanceBadge'
import { FotoLotto } from './FotoLotto'

type Props = {
  lotto: Lotto
  azienda: Azienda
  distanzaKm?: number
  distanzaDa?: string
  className?: string
  /** colonna corrispondente evidenziata sulla mappa */
  evidenziato?: boolean
  /** anteprima (es. riepilogo di "Pubblica"): il lotto non esiste ancora, niente link alla scheda */
  senzaLink?: boolean
  /** prima card della lista: la foto non aspetta il lazy loading */
  priorita?: boolean
} & Omit<HTMLAttributes<HTMLElement>, 'className'>

export const TIPO_AZIENDA: Record<Azienda['tipo'], string> = {
  impresa: 'Impresa edile',
  rivendita: 'Rivendita',
  showroom: 'Showroom',
  artigiano: 'Artigiano',
}

/** Tacca semicircolare sul bordo: l'etichetta sembra staccata da un rotolo. */
function Tacca({ lato }: { lato: 'sx' | 'dx' }) {
  return (
    <span
      aria-hidden="true"
      className={`absolute top-0 size-5 -translate-y-1/2 rounded-full border-2 border-dashed border-asfalto bg-cemento ${lato === 'sx' ? '-left-[11px]' : '-right-[11px]'}`}
      style={{ clipPath: lato === 'sx' ? 'inset(0 0 0 50%)' : 'inset(0 50% 0 0)' }}
    />
  )
}

export function LotCard({ lotto, azienda, distanzaKm, distanzaDa, className = '', evidenziato = false, senzaLink = false, priorita = false, ...resto }: Props) {
  const sconto = scontoPercento(lotto.prezzo, lotto.prezzoListino)
  const unita = etichettaUnita(lotto.quantita, lotto.unita)
  const comuneAzienda = nomeComune(azienda)
  const titoloId = `lotto-${lotto.id}`

  return (
    <article
      aria-labelledby={titoloId}
      {...resto}
      // tutta l'etichetta apre la scheda: il link del titolo si allarga su tutta la card;
      // il focus da tastiera si vede sull'intera etichetta
      className={`relative flex flex-col rounded-etichetta border-2 border-asfalto bg-carta text-asfalto transition-shadow duration-150 has-[a:focus-visible]:outline-3 has-[a:focus-visible]:outline-offset-3 has-[a:focus-visible]:outline-asfalto ${evidenziato ? 'border-solid shadow-[0_0_0_4px_var(--color-giallo)]' : 'border-dashed hover:border-solid'} ${className}`}
    >
      {/* testata etichetta */}
      <header className="flex items-baseline justify-between gap-3 px-4 pt-3 pb-2.5">
        <span className="num text-[15px] font-bold tracking-tight">{lotto.codice}</span>
        <span className="truncate text-[13px] text-asfalto-2">{lotto.categoria}</span>
      </header>

      <div className="relative aspect-[3/2] overflow-hidden border-y-2 border-asfalto bg-cemento-2">
        <FotoLotto lotto={lotto} priorita={priorita} sizes="(min-width: 1024px) 400px, (min-width: 640px) calc(50vw - 44px), calc(100vw - 32px)" />
        {distanzaKm !== undefined && (
          <DistanceBadge km={distanzaKm} da={distanzaDa} className="absolute bottom-3 left-3 shadow-[0_0_0_2px_var(--color-carta)]" />
        )}
      </div>

      {/* quantità: il dato più importante, leggibile a un metro di distanza */}
      <div className="px-4 pt-4">
        <p className="num flex items-baseline gap-2 leading-[0.9]">
          <span className="text-[52px] font-bold tracking-[-0.045em]">{formatNumero(lotto.quantita)}</span>
          <span className="text-[22px] font-semibold tracking-tight">{unita}</span>
        </p>
        <h3 id={titoloId} className="mt-2.5 text-[19px] leading-[1.2] font-bold font-semiwide">
          {senzaLink ? (
            lotto.titolo
          ) : (
            <Link to={urlLotto(lotto.codice)} className="outline-none after:absolute after:inset-0 after:content-['']">
              {lotto.titolo}
            </Link>
          )}
        </h3>
      </div>

      {/* il formato sta solo nella scheda completa */}
      <dl className="mx-4 mt-4 grid grid-cols-[1.35fr_1fr] border-t-2 border-asfalto text-[14px]">
        <div className="border-r border-asfalto/25 py-2 pr-3">
          <dt className="text-[12px] text-asfalto-2">Colore</dt>
          <dd className="font-semibold first-letter:uppercase">{lotto.colore}</dd>
        </div>
        <div className="py-2 pl-3">
          <dt className="text-[12px] text-asfalto-2">Peso stimato</dt>
          <dd className="num font-semibold">{formatKg(lotto.pesoKg)}</dd>
        </div>
      </dl>

      {/* prezzo: linea di strappo con tacche */}
      <div className="relative mt-3 border-t-2 border-dashed border-asfalto px-4 pt-3.5 pb-3.5">
        <Tacca lato="sx" />
        <Tacca lato="dx" />
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <p className="flex items-baseline gap-2.5">
            <span className="sr-only">
              Prezzo {formatEuro(lotto.prezzo)} {perUnita(lotto.unita).replace('/', 'al ')}, invece di {formatEuro(lotto.prezzoListino)} di listino: {sconto}% in meno.
            </span>
            <span aria-hidden="true" className="num inline-flex items-baseline rounded-[2px] bg-giallo px-2 py-1 text-[22px] font-bold leading-none tracking-tight">
              {formatEuro(lotto.prezzo)}
              <span className="ml-0.5 text-[13px] font-semibold">{perUnita(lotto.unita)}</span>
            </span>
            <span aria-hidden="true" className="num text-[14px] text-asfalto-2">
              <s>{formatEuro(lotto.prezzoListino)}</s>
              <span className="ml-1.5 font-semibold text-asfalto">−{sconto}%</span>
            </span>
          </p>
        </div>
      </div>

      <footer className="mt-auto flex items-end justify-between gap-3 border-t border-asfalto/25 px-4 pt-3 pb-3.5">
        <div className="min-w-0">
          <p className="truncate text-[14px] leading-tight font-semibold">{azienda.nome}</p>
          <p className="mt-0.5 text-[13px] leading-tight text-asfalto-2">
            {TIPO_AZIENDA[azienda.tipo]} a {comuneAzienda}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <Barcode codice={lotto.codice} className="h-7 w-20 text-asfalto" />
          <p className="num text-[11px] leading-none text-asfalto-2">
            <span className="sr-only">Pubblicato il </span>
            <time dateTime={lotto.data}>{formatData(lotto.data)}</time>
          </p>
        </div>
      </footer>
    </article>
  )
}
