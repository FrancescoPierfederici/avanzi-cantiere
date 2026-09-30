// Avviso globale: la memoria del browser è piena e l'archivio non si salva più.
import { useState } from 'react'
import { useMemoriaPiena } from '../../lib/archivio'
import { Link } from '../../router'
import { IconaChiudi } from '../ui/icone'

export function MemoriaPiena() {
  const piena = useMemoriaPiena()
  const [nascosto, setNascosto] = useState(false)
  if (!piena || nascosto) return null
  return (
    <div role="alert" className="fixed inset-x-0 top-[34px] z-40 border-b-2 border-asfalto bg-giallo">
      <div className="mx-auto flex max-w-[1320px] items-center gap-3 px-4 py-2 sm:px-8">
        <p className="flex-1 text-[15px] leading-snug text-asfalto">
          <strong>Memoria del browser piena.</strong> Le ultime modifiche restano solo finché tieni aperta questa pagina: le foto caricate
          occupano molto spazio.{' '}
          <Link to="/i-miei-ritiri#azzera" onClick={() => setNascosto(true)} className="inline-flex min-h-12 items-center font-semibold underline decoration-2 underline-offset-4">
            Azzera i dati della demo
          </Link>
        </p>
        <button type="button" onClick={() => setNascosto(true)} aria-label="Chiudi l'avviso sulla memoria" className="grid size-12 shrink-0 place-items-center rounded-etichetta text-asfalto hover:bg-asfalto/10">
          <IconaChiudi />
        </button>
      </div>
    </div>
  )
}
