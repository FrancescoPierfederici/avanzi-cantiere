import { forwardRef } from 'react'
import { kgInCircolo, useArchivio } from '../../lib/archivio'
import { KgCounter } from '../ui/KgCounter'
import { SearchInput } from '../ui/SearchInput'

export const SUGGERIMENTI = ['gres 60x60 grigio vicino a Senigallia', 'mattoni forati a Jesi', 'mattoni vicino a Torino']

type Props = {
  onCerca: (testo: string) => void
}

/**
 * Titolo, ricerca e contatore sopra il globo.
 * Il ref serve a misurarne il fondo: il globo parte subito sotto.
 */
export const Intro = forwardRef<HTMLDivElement, Props>(function Intro({ onCerca }, ref) {
  const archivio = useArchivio()
  return (
    <div ref={ref} className="pointer-events-none relative z-10 mx-auto flex max-w-[860px] flex-col items-center px-4 pt-2 text-center sm:pt-3">
      <h1 className="max-w-[24ch] text-[24px] leading-[1.08] font-extrabold font-wide tracking-[-0.02em] sm:text-[32px] lg:text-[34px]">
        Ogni giorno materiale nuovo finisce in discarica. Qui trova un altro cantiere.
      </h1>
      <div className="pointer-events-auto mt-4 w-full max-w-[760px] text-left sm:mt-5">
        <SearchInput onCerca={onCerca} suggerimenti={SUGGERIMENTI} scorriSuggerimenti />
      </div>
      {/* sotto i suggerimenti, sulla colonna della ricerca: a destra da desktop, centrato su mobile */}
      <div className="pointer-events-auto mt-3 flex w-full max-w-[760px] justify-center lg:justify-end">
        <KgCounter kg={kgInCircolo(archivio)} taglia="riga" etichetta="rimessi in circolo" />
      </div>
    </div>
  )
})
