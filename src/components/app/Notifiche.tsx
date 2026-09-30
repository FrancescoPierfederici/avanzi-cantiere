// Toast degli avvisi: compare quando arriva un lotto che corrisponde a un avviso salvato,
// anche se è stato pubblicato in un'altra finestra. Le notifiche già presenti al caricamento
// non si ripresentano come toast: le mostra il badge del menu.
import { useEffect, useRef, useState } from 'react'
import { segnaNotificheLette, useArchivio, type Notifica } from '../../lib/archivio'
import { urlLotto } from '../../lib/navigazione'
import { Link } from '../../router'
import { IconaCampana, IconaChiudi } from '../ui/icone'

const DURATA_MS = 12000

export function Notifiche() {
  const archivio = useArchivio()
  const viste = useRef<Set<string> | null>(null)
  const [toast, setToast] = useState<Notifica[]>([])

  useEffect(() => {
    // primo giro: quello che c'è già è "visto"
    if (!viste.current) {
      viste.current = new Set(archivio.notifiche.map((n) => n.id))
      return
    }
    const nuove = archivio.notifiche.filter((n) => !viste.current!.has(n.id))
    if (nuove.length === 0) return
    nuove.forEach((n) => viste.current!.add(n.id))
    setToast((t) => [...nuove, ...t].slice(0, 3))
  }, [archivio])

  useEffect(() => {
    if (toast.length === 0) return
    const timer = window.setTimeout(() => setToast((t) => t.slice(0, -1)), DURATA_MS)
    return () => window.clearTimeout(timer)
  }, [toast])

  const chiudi = (id: string) => setToast((t) => t.filter((n) => n.id !== id))

  return (
    <div aria-live="polite" className="pointer-events-none fixed right-4 bottom-20 left-4 z-50 flex flex-col items-end gap-3 lg:bottom-6 lg:left-auto">
      {toast.map((n) => (
        <div key={n.id} role="status" className="pointer-events-auto w-full max-w-[400px] rounded-etichetta border-2 border-asfalto bg-asfalto p-4 text-cemento shadow-[0_6px_0_0_var(--color-giallo)] su-scuro">
          <div className="flex items-start gap-3">
            <IconaCampana className="mt-0.5 shrink-0 text-giallo" />
            <p className="flex-1 text-[15px] leading-snug">{n.testo}</p>
            <button type="button" onClick={() => chiudi(n.id)} aria-label="Chiudi l'avviso" className="-mt-2 -mr-2 grid size-12 shrink-0 place-items-center rounded-etichetta hover:bg-asfalto-3">
              <IconaChiudi />
            </button>
          </div>
          <Link
            to={urlLotto(n.lottoCodice)}
            onClick={() => {
              segnaNotificheLette([n.id])
              chiudi(n.id)
            }}
            className="mt-2 inline-flex min-h-12 items-center rounded-etichetta bg-giallo px-4 font-display text-[15px] font-bold font-semiwide text-asfalto"
          >
            Vedi il lotto
          </Link>
        </div>
      ))}
    </div>
  )
}
