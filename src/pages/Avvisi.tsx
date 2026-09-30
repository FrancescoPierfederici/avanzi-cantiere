import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Azzera } from '../components/app/Azzera'
import { Testata } from '../components/app/Testata'
import { DemoBanner } from '../components/ui/DemoBanner'
import { comuni } from '../data'
import { eliminaAvviso, luogoAvviso, modificaAvviso, segnaNotificheLette, useArchivio, type Avviso } from '../lib/archivio'
import { formatDataLunga } from '../lib/format'
import { urlLotto } from '../lib/navigazione'
import { luoghiCaricati } from '../lib/caricaLuoghi'
import { interpreta } from '../lib/parser'
import { riferimentoDi } from '../lib/zone'
import { Link } from '../router'

const RAGGI = [10, 25, 50]

export function Avvisi() {
  const archivio = useArchivio()
  const titoloRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    document.title = 'I tuoi avvisi – Avanzi'
    titoloRef.current?.focus({ preventScroll: true })
    // aprendo la pagina le notifiche sono viste: il badge si spegne
    segnaNotificheLette()
  }, [])

  return (
    <>
      <DemoBanner />
      <Testata larghezza="max-w-[900px]" />
      <main className="mx-auto max-w-[900px] px-4 pt-5 pb-28 sm:px-8 lg:pb-16">
        <h1 ref={titoloRef} tabIndex={-1} className="text-[30px] leading-tight font-extrabold font-wide outline-none sm:text-[36px]">
          I tuoi avvisi
        </h1>
        <p className="mt-2 max-w-[60ch] text-[16px] text-asfalto-2">
          Quando qualcuno pubblica un lotto che corrisponde, compare un avviso nell'app con il link alla scheda.
        </p>

        {archivio.avvisi.length === 0 ? (
          <div className="mt-8 rounded-etichetta border-2 border-dashed border-asfalto bg-carta p-5">
            <p className="text-[17px]">Nessun avviso salvato.</p>
            <p className="mt-1 text-[15px] text-asfalto-2">Cerca un materiale e, nei risultati, premi «Avvisami quando arriva».</p>
            <Link to="/" className="mt-4 inline-flex min-h-12 items-center rounded-etichetta border-2 border-asfalto bg-giallo px-5 font-display text-[15px] font-bold font-semiwide">
              Cerca materiale
            </Link>
          </div>
        ) : (
          <ul className="mt-8 grid gap-5">
            {archivio.avvisi.map((a) => (
              <li key={a.id}>
                <SchedaAvviso a={a} arrivati={archivio.notifiche.filter((n) => n.avvisoId === a.id)} />
              </li>
            ))}
          </ul>
        )}
        <Azzera />
      </main>
    </>
  )
}

function SchedaAvviso({ a, arrivati }: { a: Avviso; arrivati: { id: string; lottoCodice: string; testo: string }[] }) {
  const [modifica, setModifica] = useState(false)
  const [elimina, setElimina] = useState(false)
  const [testo, setTesto] = useState(a.testo)
  const [raggio, setRaggio] = useState(a.raggioKm)
  const comune = luogoAvviso(a).nome

  function salva(e: FormEvent) {
    e.preventDefault()
    const q = interpreta(testo, comuni, luoghiCaricati() ?? undefined)
    // se il nuovo testo nomina un comune, diventa la zona dell'avviso
    const base = comuni.find((c) => c.id === q.comune)
    const nuovo = base ?? (q.luogo && riferimentoDi(q.luogo))
    modificaAvviso(a.id, {
      testo: testo.trim() || a.testo,
      query: q,
      ...(nuovo ? { comune: nuovo.id, luogo: { nome: nuovo.nome, lat: nuovo.lat, lng: nuovo.lng } } : {}),
      raggioKm: raggio,
    })
    setModifica(false)
  }

  return (
    <article aria-labelledby={`av-${a.id}`} className="rounded-etichetta border-2 border-dashed border-asfalto bg-carta p-5">
      {modifica ? (
        <form onSubmit={salva} className="grid gap-4">
          <label className="block">
            <span className="text-[14px] font-semibold">Cosa cerchi</span>
            <input value={testo} onChange={(e) => setTesto(e.target.value)} className="mt-1 h-12 w-full rounded-etichetta border-2 border-asfalto bg-cemento px-3 text-[16px]" />
          </label>
          <fieldset>
            <legend className="text-[14px] font-semibold">Distanza massima da {comune}</legend>
            <div className="mt-1 flex gap-2">
              {RAGGI.map((r) => (
                <label key={r} className={`flex min-h-12 min-w-20 cursor-pointer items-center justify-center rounded-etichetta border-2 border-asfalto px-3 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-asfalto ${raggio === r ? 'bg-asfalto text-cemento' : 'bg-cemento'}`}>
                  <input type="radio" name={`raggio-${a.id}`} checked={raggio === r} onChange={() => setRaggio(r)} className="sr-only" />
                  <span className="num font-semibold">{r} km</span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="flex flex-wrap gap-2">
            <button type="submit" className="min-h-12 rounded-etichetta border-2 border-asfalto bg-giallo px-5 font-display text-[15px] font-bold font-semiwide">
              Salva
            </button>
            <button type="button" onClick={() => setModifica(false)} className="min-h-12 rounded-etichetta border-2 border-asfalto px-5 font-display text-[15px] font-bold font-semiwide">
              Annulla
            </button>
          </div>
        </form>
      ) : (
        <>
          <h2 id={`av-${a.id}`} className="font-display text-[20px] leading-tight font-bold font-semiwide">
            «{a.testo}»
          </h2>
          <p className="mt-1 text-[15px] text-asfalto-2">
            Entro <span className="num">{a.raggioKm} km</span> da {comune} · dal {formatDataLunga(a.creato.slice(0, 10))}
          </p>
          {arrivati.length > 0 ? (
            <ul className="mt-3 grid gap-2">
              {arrivati.map((n) => (
                <li key={n.id}>
                  <Link to={urlLotto(n.lottoCodice)} className="inline-flex min-h-12 items-center gap-2 rounded-etichetta bg-asfalto px-4 text-[15px] font-semibold text-cemento">
                    <span className="num text-giallo">{n.lottoCodice}</span> {n.testo.replace(/^È arrivato: /, '')}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-[15px]">Ancora niente: ti avvisiamo appena arriva.</p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={() => setModifica(true)} className="min-h-12 rounded-etichetta border-2 border-asfalto px-4 font-display text-[15px] font-bold font-semiwide hover:bg-asfalto/8">
              Modifica
            </button>
            {elimina ? (
              <>
                <button type="button" onClick={() => eliminaAvviso(a.id)} className="min-h-12 rounded-etichetta border-2 border-asfalto bg-asfalto px-4 font-display text-[15px] font-bold font-semiwide text-cemento">
                  Sì, elimina
                </button>
                <button type="button" onClick={() => setElimina(false)} className="min-h-12 rounded-etichetta border-2 border-asfalto px-4 font-display text-[15px] font-bold font-semiwide">
                  No
                </button>
              </>
            ) : (
              <button type="button" onClick={() => setElimina(true)} className="min-h-12 rounded-etichetta border-2 border-asfalto px-4 font-display text-[15px] font-bold font-semiwide hover:bg-asfalto/8">
                Elimina
              </button>
            )}
          </div>
        </>
      )}
    </article>
  )
}
