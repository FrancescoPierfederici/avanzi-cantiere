// Pittogrammi delle categorie per i pulsanti grandi di "Pubblica". Tratto 2, decorativi.
import type { Categoria } from '../../data/types'

const TRATTI: Record<Categoria, string> = {
  'Gres porcellanato': 'M4 4h16v16H4zM12 4v16M4 12h16',
  Rivestimenti: 'M4 4h16v16H4zM4 9.3h16M4 14.6h16M10 4v5.3M15 9.3v5.3M10 14.6V20',
  Parquet: 'M3 7h18M3 12h18M3 17h18M8 7v5M15 12v5M11 17v3M13 4v3',
  'Pietra naturale': 'M4 8l4-3h5l3 3-2 4H6zM13 13l4-1 3 3-1 4h-5l-2-3zM4 14l4 1 1 4-3 1-3-3z',
  Laterizi: 'M3 7h18v10H3zM6 10h2v4H6zM11 10h2v4h-2zM16 10h2v4h-2z',
  Blocchi: 'M3 6h18v12H3zM6 9h5v6H6zM13 9h5v6h-5z',
  Isolanti: 'M3 5h18v4H3zM3 10h18v4H3zM3 15h18v4H3z',
  'Malte e premiscelati': 'M6 5h12l1 4-1 11H6L5 9zM5 9h14M9 13h6',
  'Tubi e raccordi': 'M3 9h14a3 3 0 0 1 0 6H3zM17 9a3 3 0 0 0 0 6M20 12h1',
  Sanitari: 'M4 10h16a8 5 0 0 1-16 0zM9 15v4h6v-4M12 5v5',
  Rubinetteria: 'M5 20h6M8 20v-9h8a3 3 0 0 1 3 3v1M8 11V7h5M19 18v1',
  Serramenti: 'M5 3h14v18H5zM12 3v18M5 12h14',
  'Porte interne': 'M6 3h12v18H6zM15 12h.5M4 21h16',
}

export function IconaCategoria({ categoria, className = '' }: { categoria: Categoria; className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" className={className}>
      <path d={TRATTI[categoria]} />
    </svg>
  )
}
