import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { IconaCategoria } from '../components/pubblica/IconaCategoria'
import { Button } from '../components/ui/Button'
import { DemoBanner } from '../components/ui/DemoBanner'
import { LotCard } from '../components/ui/LotCard'
import { Scelta } from '../components/ui/Scelta'
import { CATALOGO } from '../data/catalogo'
import { comuni } from '../data'
import type { Unita } from '../data/types'
import { pubblica } from '../lib/archivio'
import { etichettaUnita, formatEuro, formatKg, formatNumero, perUnita, scontoPercento } from '../lib/format'
import { memoria } from '../lib/memoria'
import {
  arrotondaPrezzo, bozzaCompleta, CATEGORIE, creaLotto, kgPerUnita, listinoPerUnita, numeroLibero, opzioneDi, passoPubblica,
  prezzoSuggerito, preparaFoto, ricercaPer, voceDi, type Bozza,
} from '../lib/pubblica'
import { Link, navigate } from '../router'

const PASSI = ['Foto', 'Materiale', 'Quantità', 'Prezzo', 'Riepilogo'] as const
const CHIAVE_BOZZA = 'avanzi:bozza'

function leggiBozza(): Bozza {
  try {
    return JSON.parse(window.sessionStorage.getItem(CHIAVE_BOZZA) ?? '{}') as Bozza
  } catch {
    return {}
  }
}

function passoDaUrl(): number {
  const n = Number(new URLSearchParams(window.location.search).get('passo'))
  return n >= 1 && n <= PASSI.length ? n : 1
}

export function Pubblica() {
  const [bozza, setBozza] = useState<Bozza>(leggiBozza)
  const [passo, setPasso] = useState(passoDaUrl)
  const titoloRef = useRef<HTMLHeadingElement>(null)

  // la bozza sopravvive a Indietro, al ricaricamento e al cambio di passo
  useEffect(() => {
    try {
      window.sessionStorage.setItem(CHIAVE_BOZZA, JSON.stringify(bozza))
    } catch {
      /* foto troppo grande per lo storage: la bozza resta in memoria */
    }
  }, [bozza])

  // il passo sta nell'URL: il tasto Indietro del telefono torna al passo precedente
  useEffect(() => {
    const suPop = () => setPasso(passoDaUrl())
    window.addEventListener('popstate', suPop)
    return () => window.removeEventListener('popstate', suPop)
  }, [])

  useEffect(() => {
    document.title = `Pubblica: ${PASSI[passo - 1]} – Avanzi`
    titoloRef.current?.focus({ preventScroll: true })
    window.scrollTo({ top: 0 })
  }, [passo])

  const cambia = (c: Partial<Bozza>) => setBozza((b) => ({ ...b, ...c }))

  const vai = (n: number) => {
    window.history.pushState({ passo: n }, '', `/pubblica?passo=${n}`)
    setPasso(n)
  }
  const indietro = () => {
    // se il passo precedente è nella cronologia, ci si torna davvero (come il tasto Indietro)
    if ((window.history.state as { passo?: number } | null)?.passo === passo && passo > 1) window.history.back()
    else if (passo > 1) {
      window.history.replaceState({ passo: passo - 1 }, '', `/pubblica?passo=${passo - 1}`)
      setPasso(passo - 1)
    }
  }

  const voce = voceDi(bozza.voce)
  const pronto = [
    !!bozza.foto,
    !!(bozza.categoria && bozza.voce && bozza.formato && bozza.colore),
    !!(bozza.unita && bozza.quantita && bozza.quantita > 0),
    !!(bozza.prezzo && bozza.prezzo > 0),
    bozzaCompleta(bozza),
  ][passo - 1]

  // valori predefiniti quando si entra in un passo: meno tocchi, stesso risultato
  useEffect(() => {
    if (!voce) return
    if (passo === 3 && !bozza.unita) {
      const o = opzioneDi(voce)
      const p = passoPubblica(voce, bozza.formato, o.unita)
      cambia({ unita: o.unita, quantita: +(Math.max(p, Math.round(o.qty[0] / p) * p)).toFixed(2) })
    }
    if (passo === 4 && !bozza.prezzo) cambia({ prezzo: prezzoSuggerito(voce, bozza.unita) })
    if (passo === 5 && (!bozza.comune || !bozza.numero)) {
      // al riepilogo il codice diventa definitivo: quello che vedi è quello che viene pubblicato
      const comune = bozza.comune ?? memoria.zona(comuni.map((c) => c.id)) ?? 'senigallia'
      cambia({ comune, numero: numeroLibero(comune, bozza.numero) })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passo, voce])

  function pubblicaOra() {
    if (!bozzaCompleta(bozza)) return
    const { lotto, azienda } = creaLotto(bozza)
    pubblica(lotto, azienda)
    memoria.segnaVisitato()
    memoria.salvaZona(bozza.comune)
    try {
      window.sessionStorage.removeItem(CHIAVE_BOZZA)
    } catch {
      /* niente */
    }
    navigate(`/?q=${encodeURIComponent(ricercaPer(lotto, bozza.comune))}&nuovo=${encodeURIComponent(lotto.codice)}`)
  }

  return (
    <>
      <DemoBanner />
      <header className="mx-auto flex max-w-[760px] items-center justify-between gap-4 px-4 pt-3 sm:px-8">
        <Link to="/" className="flex min-h-12 items-center font-display text-[20px] font-black font-wide tracking-tight">
          Avanzi
        </Link>
        <Link to="/" className="inline-flex min-h-12 items-center rounded-etichetta px-3 font-display text-[15px] font-bold font-semiwide hover:bg-asfalto/8">
          Esci
        </Link>
      </header>

      <main className="mx-auto max-w-[760px] px-4 pt-3 pb-36 sm:px-8 lg:pb-16">
        <Avanzamento passo={passo} />
        <h1 ref={titoloRef} tabIndex={-1} className="mt-5 text-[28px] leading-tight font-extrabold font-wide outline-none sm:text-[34px]">
          {['Una foto del materiale', 'Che materiale è?', 'Quanto ne hai?', 'A quanto lo vendi?', 'Controlla e pubblica'][passo - 1]}
        </h1>

        <div className="mt-5">
          {passo === 1 && <PassoFoto bozza={bozza} cambia={cambia} />}
          {passo === 2 && <PassoMateriale bozza={bozza} cambia={cambia} />}
          {passo === 3 && voce && <PassoQuantita bozza={bozza} cambia={cambia} />}
          {passo === 4 && voce && <PassoPrezzo bozza={bozza} cambia={cambia} />}
          {passo === 5 && <PassoRiepilogo bozza={bozza} cambia={cambia} />}
        </div>

        {/* azioni: fisse in basso sul telefono, in linea su desktop */}
        <div className="fixed inset-x-0 bottom-0 z-30 border-t-2 border-asfalto bg-cemento px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] lg:static lg:mt-10 lg:border-0 lg:bg-transparent lg:p-0">
          <div className="mx-auto flex max-w-[760px] gap-3">
            {passo > 1 && (
              <Button variante="contorno" taglia="lg" onClick={indietro} className="flex-1 bg-cemento lg:flex-none">
                Indietro
              </Button>
            )}
            {passo < PASSI.length ? (
              <Button taglia="lg" onClick={() => vai(passo + 1)} disabled={!pronto} className="flex-[2] lg:flex-none">
                Avanti
              </Button>
            ) : (
              <Button taglia="lg" onClick={pubblicaOra} disabled={!pronto} className="flex-[2] lg:flex-none">
                Pubblica
              </Button>
            )}
          </div>
        </div>
      </main>
    </>
  )
}

function Avanzamento({ passo }: { passo: number }) {
  return (
    <nav aria-label="Avanzamento">
      <p className="text-[14px] font-semibold">
        Passo <span className="num">{passo}</span> di <span className="num">{PASSI.length}</span> · {PASSI[passo - 1]}
      </p>
      <ol className="mt-2 grid grid-cols-5 gap-1.5">
        {PASSI.map((p, i) => (
          <li key={p} aria-current={i + 1 === passo ? 'step' : undefined} className={`h-2 rounded-full ${i + 1 <= passo ? 'bg-asfalto' : 'bg-cemento-3'}`}>
            <span className="sr-only">
              {p}
              {i + 1 < passo ? ', fatto' : i + 1 === passo ? ', in corso' : ''}
            </span>
          </li>
        ))}
      </ol>
    </nav>
  )
}

type PropsPasso = { bozza: Bozza; cambia: (c: Partial<Bozza>) => void }

function Gruppo({ titolo, children }: { titolo: string; children: ReactNode }) {
  return (
    <fieldset className="mt-6 first:mt-0">
      <legend className="mb-2 text-[15px] font-semibold">{titolo}</legend>
      {children}
    </fieldset>
  )
}

// ── passo 1: foto ──────────────────────────────────────────────────────────

function PassoFoto({ bozza, cambia }: PropsPasso) {
  const [errore, setErrore] = useState<string | null>(null)
  const [lavoro, setLavoro] = useState(false)

  async function carica(file?: File) {
    if (!file) return
    setErrore(null)
    setLavoro(true)
    try {
      cambia({ foto: await preparaFoto(file), fotoPropria: true })
    } catch {
      setErrore('Questa immagine non si legge. Prova con un’altra foto o scegline una di esempio.')
    } finally {
      setLavoro(false)
    }
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-[1fr_1fr]">
        <label className="flex min-h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-etichetta border-2 border-dashed border-asfalto bg-carta p-4 text-center has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-3 has-[:focus-visible]:outline-asfalto hover:bg-cemento-2">
          <svg aria-hidden="true" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
            <circle cx="12" cy="13" r="3.5" />
          </svg>
          <span className="font-display text-[18px] font-bold font-semiwide">{lavoro ? 'Preparo la foto…' : 'Scatta o carica una foto'}</span>
          <span className="text-[14px] text-asfalto-2">Dal telefono o dal computer</span>
          <input type="file" accept="image/*" className="sr-only" onChange={(e) => carica(e.target.files?.[0])} />
        </label>
        <div className="aspect-[4/3] overflow-hidden rounded-etichetta border-2 border-asfalto bg-cemento-2">
          {bozza.foto ? (
            <img src={bozza.foto} alt="Anteprima della foto scelta" className="size-full object-cover" />
          ) : (
            <p className="grid size-full place-items-center p-4 text-center text-[14px] text-asfalto-2">Qui vedrai l'anteprima</p>
          )}
        </div>
      </div>
      {errore && (
        <p role="alert" className="mt-3 text-[15px] font-semibold text-[#B3261E]">
          {errore}
        </p>
      )}

      <Gruppo titolo="Oppure scegli una foto di esempio">
        <div role="radiogroup" aria-label="Foto di esempio" className="grid grid-cols-4 gap-2 sm:grid-cols-8">
          {CATALOGO.map((v) => {
            const src = `/lotti/${v.foto}.webp`
            const scelta = bozza.foto === src
            return (
              <label key={v.foto} className={`relative aspect-square cursor-pointer overflow-hidden rounded-etichetta border-2 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-asfalto ${scelta ? 'border-asfalto ring-4 ring-giallo' : 'border-cemento-3'}`}>
                <input
                  type="radio"
                  name="foto-esempio"
                  checked={scelta}
                  onChange={() => {
                    // con la foto di esempio arriva anche il materiale: un passo in meno
                    const cambi: Partial<Bozza> = { foto: src, fotoPropria: false }
                    if (!bozza.categoria) Object.assign(cambi, { categoria: v.categoria, voce: v.foto, formato: v.formati[0].f, colore: v.colori[0] })
                    cambia(cambi)
                  }}
                  className="sr-only"
                />
                <img src={`/lotti/720/${v.foto}.webp`} alt={v.alt} loading="lazy" className="size-full object-cover" />
              </label>
            )
          })}
        </div>
      </Gruppo>
    </>
  )
}

// ── passo 2: categoria, tipo, formato, colore ────────────────────────────────

function PassoMateriale({ bozza, cambia }: PropsPasso) {
  const cat = CATEGORIE.find((c) => c.categoria === bozza.categoria)
  const voce = voceDi(bozza.voce)

  const scegliVoce = (k: (typeof CATALOGO)[number]) =>
    // cambiando materiale, quantità e prezzo vanno ricalcolati
    cambia({ categoria: k.categoria, voce: k.foto, formato: k.formati[0].f, colore: k.colori[0], unita: undefined, quantita: undefined, prezzo: undefined })

  return (
    <>
      <Gruppo titolo="Categoria">
        <div role="radiogroup" aria-label="Categoria" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {CATEGORIE.map((c) => (
            <Scelta key={c.categoria} nome="categoria" valore={c.categoria} scelto={bozza.categoria === c.categoria} onScegli={() => scegliVoce(c.voci[0])} className="min-h-24 flex-col gap-1.5 text-[15px] leading-tight font-semibold">
              <IconaCategoria categoria={c.categoria} />
              {c.categoria}
            </Scelta>
          ))}
        </div>
      </Gruppo>

      {cat && cat.voci.length > 1 && (
        <Gruppo titolo="Tipo">
          <div role="radiogroup" aria-label="Tipo" className="flex flex-wrap gap-2">
            {cat.voci.map((v) => (
              <Scelta key={v.foto} nome="tipo" valore={v.foto} scelto={bozza.voce === v.foto} onScegli={() => scegliVoce(v)}>
                <span className="first-letter:uppercase">{v.nome}</span>
              </Scelta>
            ))}
          </div>
        </Gruppo>
      )}

      {voce && (
        <>
          <Gruppo titolo="Formato">
            <div role="radiogroup" aria-label="Formato" className="flex flex-wrap gap-2">
              {voce.formati.map((f) => (
                <Scelta key={f.f} nome="formato" valore={f.f} scelto={bozza.formato === f.f} onScegli={() => cambia({ formato: f.f, quantita: undefined })}>
                  <span className="num">{f.f}</span>
                </Scelta>
              ))}
            </div>
          </Gruppo>
          <Gruppo titolo="Colore">
            <div role="radiogroup" aria-label="Colore" className="flex flex-wrap gap-2">
              {voce.colori.map((c) => (
                <Scelta key={c} nome="colore" valore={c} scelto={bozza.colore === c} onScegli={() => cambia({ colore: c })}>
                  <span className="first-letter:uppercase">{c}</span>
                </Scelta>
              ))}
            </div>
          </Gruppo>
        </>
      )}
    </>
  )
}

// ── passo 3: quantità e unità ─────────────────────────────────────────────

function PassoQuantita({ bozza, cambia }: PropsPasso) {
  const voce = voceDi(bozza.voce)!
  const unita = bozza.unita ?? opzioneDi(voce).unita
  const passo = passoPubblica(voce, bozza.formato, unita)
  const q = bozza.quantita ?? 0
  const peso = Math.round(q * kgPerUnita(voce, unita))
  const imposta = (v: number) => cambia({ quantita: Math.max(0, +(Math.round(v / passo) * passo).toFixed(2)) })

  return (
    <>
      {voce.opzioni.length > 1 && (
        <Gruppo titolo="Unità">
          <div role="radiogroup" aria-label="Unità" className="flex flex-wrap gap-2">
            {voce.opzioni.map((o) => (
              <Scelta
                key={o.unita}
                nome="unita"
                valore={o.unita}
                scelto={unita === o.unita}
                onScegli={() => cambia({ unita: o.unita as Unita, quantita: o.unita === 'bancali' ? 1 : Math.max(1, o.qty[0]), prezzo: undefined })}
              >
                {o.unita}
              </Scelta>
            ))}
          </div>
        </Gruppo>
      )}
      <Gruppo titolo={`Quantità (${unita})`}>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => imposta(q - passo)} aria-label="Meno" className="grid size-14 place-items-center rounded-etichetta border-2 border-asfalto bg-carta text-[28px] font-bold">
            −
          </button>
          <label className="flex items-baseline gap-2">
            <span className="sr-only">Quantità in {unita}</span>
            <input
              type="number"
              inputMode="decimal"
              min={passo}
              step={passo}
              value={q || ''}
              onChange={(e) => cambia({ quantita: Number(e.target.value) })}
              onBlur={(e) => imposta(Number(e.target.value))}
              className="num h-14 w-36 rounded-etichetta border-2 border-asfalto bg-carta px-3 text-[26px] font-bold"
            />
            <span className="num text-[20px] font-semibold">{etichettaUnita(q, unita)}</span>
          </label>
          <button type="button" onClick={() => imposta(q + passo)} aria-label="Più" className="grid size-14 place-items-center rounded-etichetta border-2 border-asfalto bg-carta text-[28px] font-bold">
            +
          </button>
        </div>
        {passo > 1 && (
          <p className="mt-2 text-[14px] text-asfalto-2">
            A scatole intere da <span className="num">{formatNumero(passo)} m²</span> ({bozza.formato}).
          </p>
        )}
      </Gruppo>
      <p aria-live="polite" className="mt-6 rounded-etichetta border-2 border-asfalto bg-carta px-4 py-3 text-[17px]">
        Peso stimato: <span className="num font-bold">≈ {formatKg(peso)}</span>
        <span className="block text-[14px] text-asfalto-2">Calcolato dal peso medio di {voce.nome}. Serve a chi viene a ritirare.</span>
      </p>
    </>
  )
}

// ── passo 4: prezzo ───────────────────────────────────────────────────────

function PassoPrezzo({ bozza, cambia }: PropsPasso) {
  const voce = voceDi(bozza.voce)!
  const unita = bozza.unita!
  const listino = listinoPerUnita(voce, unita)
  const prezzo = bozza.prezzo ?? 0
  const sconto = prezzo > 0 ? scontoPercento(prezzo, listino) : 0
  const totale = Math.round(prezzo * (bozza.quantita ?? 0) * 100) / 100

  return (
    <>
      <p className="text-[16px]">
        Il nuovo costa circa <span className="num font-bold">{formatEuro(listino)}{perUnita(unita)}</span>. Chi vende avanzi di solito chiede dal 35 al 70% in meno.
      </p>
      <Gruppo titolo="Prezzo suggerito">
        <div role="radiogroup" aria-label="Prezzo suggerito" className="grid grid-cols-3 gap-2">
          {[0.7, 0.475, 0.35].map((f) => {
            const v = arrotondaPrezzo(listino * f)
            return (
              <Scelta key={f} nome="suggerito" valore={String(v)} scelto={prezzo === v} onScegli={() => cambia({ prezzo: v })} className="flex-col">
                <span className="num text-[18px] font-bold">{formatEuro(v)}</span>
                <span className="text-[13px]">−{Math.round((1 - f) * 100)}%</span>
              </Scelta>
            )
          })}
        </div>
      </Gruppo>
      <Gruppo titolo="Oppure scrivi il tuo prezzo">
        <label className="flex items-baseline gap-2">
          <span className="sr-only">Prezzo in euro {perUnita(unita).replace('/', 'al ')}</span>
          <input
            type="number"
            inputMode="decimal"
            min={0.01}
            step={0.5}
            value={prezzo || ''}
            onChange={(e) => cambia({ prezzo: Number(e.target.value) })}
            className="num h-14 w-36 rounded-etichetta border-2 border-asfalto bg-carta px-3 text-[26px] font-bold"
          />
          <span className="num text-[20px] font-semibold">€{perUnita(unita)}</span>
        </label>
      </Gruppo>
      <p aria-live="polite" className="mt-6 rounded-etichetta border-2 border-asfalto bg-carta px-4 py-3 text-[17px]">
        {prezzo >= listino ? (
          <span className="font-semibold">Costa come il nuovo: difficilmente qualcuno lo prenderà.</span>
        ) : (
          <>
            <span className="num font-bold">−{sconto}%</span> sul nuovo · tutto il lotto <span className="num font-bold">{formatEuro(totale)}</span>
          </>
        )}
      </p>
    </>
  )
}

// ── passo 5: riepilogo ────────────────────────────────────────────────────

function PassoRiepilogo({ bozza, cambia }: PropsPasso) {
  const anteprima = useMemo(() => (bozzaCompleta(bozza) ? creaLotto(bozza) : null), [bozza])
  return (
    <>
      <Gruppo titolo="Dove si ritira">
        <div role="radiogroup" aria-label="Comune di ritiro" className="flex flex-wrap gap-2">
          {comuni.map((c) => (
            <Scelta key={c.id} nome="comune" valore={c.id} scelto={bozza.comune === c.id} onScegli={() => cambia({ comune: c.id, numero: numeroLibero(c.id, bozza.numero) })}>
              {c.nome}
            </Scelta>
          ))}
        </div>
      </Gruppo>
      {anteprima && (
        <div className="mt-6">
          <p className="mb-2 text-[15px] font-semibold">Così lo vedrà chi cerca</p>
          <div className="max-w-[380px]">
            <LotCard lotto={anteprima.lotto} azienda={anteprima.azienda} senzaLink />
          </div>
        </div>
      )}
    </>
  )
}
