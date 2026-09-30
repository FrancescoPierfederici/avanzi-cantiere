import { precaricaLuoghi } from '../../lib/caricaLuoghi'
import { useId, useState, type FormEvent } from 'react'
import { IconaLente } from './icone'

type Props = {
  onCerca: (testo: string) => void
  suggerimenti?: string[]
  valoreIniziale?: string
  /** su mobile i suggerimenti stanno su una riga che scorre, invece di andare a capo */
  scorriSuggerimenti?: boolean
  etichetta?: string
}

export function SearchInput({ onCerca, suggerimenti = [], valoreIniziale = '', scorriSuggerimenti = false, etichetta = 'Cerca materiale' }: Props) {
  const [testo, setTesto] = useState(valoreIniziale)
  const id = useId()

  function invia(e: FormEvent) {
    e.preventDefault()
    const t = testo.trim()
    if (t) onCerca(t)
  }

  return (
    <div>
      <form role="search" onSubmit={invia} className="flex items-stretch rounded-etichetta border-2 border-asfalto bg-carta focus-within:outline-3 focus-within:outline-offset-3 focus-within:outline-asfalto">
        <label htmlFor={id} className="sr-only">
          {etichetta}
        </label>
        <span className="grid w-12 shrink-0 place-items-center text-asfalto sm:w-14">
          <IconaLente width={22} height={22} />
        </span>
        <input
          id={id}
          type="search"
          value={testo}
          onChange={(e) => setTesto(e.target.value)}
          // l'elenco dei comuni italiani arriva prima che serva
          onFocus={precaricaLuoghi}
          placeholder="es. gres 60x60 grigio"
          autoComplete="off"
          enterKeyHint="search"
          className="min-h-14 min-w-0 flex-1 bg-transparent py-3 pr-2 text-base text-asfalto outline-none placeholder:text-asfalto-2 sm:min-h-16 sm:text-lg [&::-webkit-search-cancel-button]:hidden"
        />
        <button
          type="submit"
          className="m-1.5 min-h-12 shrink-0 rounded-[2px] bg-giallo px-4 font-display text-[15px] font-bold font-semiwide text-asfalto transition-colors hover:bg-giallo-2 focus-visible:outline-offset-1 sm:px-6"
        >
          Cerca
        </button>
      </form>

      {suggerimenti.length > 0 && (
        <div className={`mt-3 flex items-center gap-2 ${scorriSuggerimenti ? '-mx-4 flex-nowrap overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:justify-center sm:overflow-visible sm:px-0' : 'flex-wrap'}`}>
          <span className="mr-1 shrink-0 text-sm text-asfalto-2" id={`${id}-prova`}>
            Prova con
          </span>
          {suggerimenti.map((s) => (
            <button
              key={s}
              type="button"
              aria-describedby={`${id}-prova`}
              onPointerEnter={precaricaLuoghi}
              onFocus={precaricaLuoghi}
              onClick={() => {
                setTesto(s)
                onCerca(s)
              }}
              className="min-h-12 shrink-0 rounded-etichetta border border-dashed border-asfalto/60 bg-cemento px-3.5 text-left text-[15px] text-asfalto transition-colors hover:border-solid hover:border-asfalto hover:bg-carta"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
