// Menu dell'app: Pubblica · Avvisi (con badge) · I miei ritiri.
// Desktop: nelle testate delle pagine. Mobile: barra fissa in basso, a portata di pollice.
import { notificheNonLette, useArchivio } from '../../lib/archivio'
import { Link, usePath } from '../../router'
import { IconaCampana, IconaPiu, IconaQR } from '../ui/icone'

const VOCI = [
  { to: '/pubblica', testo: 'Pubblica', Icona: IconaPiu },
  { to: '/avvisi', testo: 'Avvisi', Icona: IconaCampana },
  { to: '/i-miei-ritiri', testo: 'I miei ritiri', Icona: IconaQR },
] as const

function Badge({ n }: { n: number }) {
  if (n === 0) return null
  return (
    <span aria-hidden="true" className="num absolute -top-1.5 -right-2 grid h-5 min-w-5 place-items-center rounded-full bg-giallo px-1 text-[11px] font-bold text-asfalto ring-2 ring-asfalto">
      {n}
    </span>
  )
}

/**
 * Voci in riga per le testate desktop (nascoste sotto 1024 px: lì c'è la barra in basso).
 * `compatto`: solo icone (nome letto dagli screen reader e mostrato al passaggio), per il pannello dei risultati.
 */
export function MenuApp({ className = '', compatto = false }: { className?: string; compatto?: boolean }) {
  const archivio = useArchivio()
  const nuove = notificheNonLette(archivio)
  const path = usePath()
  return (
    <nav aria-label="Menu" className={`hidden items-center gap-1 lg:flex ${className}`}>
      {VOCI.map(({ to, testo, Icona }) => (
        <Link
          key={to}
          to={to}
          aria-current={path === to ? 'page' : undefined}
          aria-label={to === '/avvisi' && nuove > 0 ? `${testo}, ${nuove} ${nuove === 1 ? 'nuovo' : 'nuovi'}` : compatto ? testo : undefined}
          title={compatto ? testo : undefined}
          className={`inline-flex min-h-12 items-center rounded-etichetta font-display text-[15px] font-bold font-semiwide hover:bg-asfalto/8 aria-[current=page]:bg-asfalto aria-[current=page]:text-cemento ${compatto ? 'min-w-12 justify-center' : 'gap-3 px-3'}`}
        >
          <span className="relative">
            <Icona />
            {to === '/avvisi' && <Badge n={nuove} />}
          </span>
          {!compatto && testo}
        </Link>
      ))}
    </nav>
  )
}

/** Barra in basso per il telefono. */
export function BarraMobile() {
  const archivio = useArchivio()
  const nuove = notificheNonLette(archivio)
  const path = usePath()
  return (
    <nav aria-label="Menu" className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-asfalto bg-cemento pb-[env(safe-area-inset-bottom)] lg:hidden">
      <ul className="grid grid-cols-3">
        {VOCI.map(({ to, testo, Icona }) => (
          <li key={to}>
            <Link
              to={to}
              aria-current={path === to ? 'page' : undefined}
              aria-label={to === '/avvisi' && nuove > 0 ? `${testo}, ${nuove} ${nuove === 1 ? 'nuovo' : 'nuovi'}` : undefined}
              className="flex h-16 flex-col items-center justify-center gap-1 text-[13px] font-semibold aria-[current=page]:bg-asfalto aria-[current=page]:text-cemento"
            >
              <span className="relative">
                <Icona width={22} height={22} />
                {to === '/avvisi' && <Badge n={nuove} />}
              </span>
              {testo}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}

/** Altezza della barra mobile: le pagine lasciano questo spazio in fondo. */
export const ALTEZZA_BARRA_MOBILE = 64
