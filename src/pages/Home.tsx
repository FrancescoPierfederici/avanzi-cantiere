import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { GloboStatico } from '../components/home/GloboStatico'
import { Intro } from '../components/home/Intro'
import { Risultati, type CampoFiltro } from '../components/home/Risultati'
import { Button } from '../components/ui/Button'
import { DemoBanner } from '../components/ui/DemoBanner'
import { KgCounter } from '../components/ui/KgCounter'
import { MenuApp } from '../components/app/MenuApp'
import { IconaAvanti } from '../components/ui/icone'
import { comuni } from '../data'
import { aziendaDi, kgInCircolo, lottiAttivi, lottiDellaZona, tuttiILotti, tutteLeAziende, useArchivio } from '../lib/archivio'
import type { ComuneId } from '../data/types'
import { useDesktop, useRiduciMovimento } from '../hooks/useRiduciMovimento'
import { cerca, MAX_INQUADRATI_MOBILE, type Risultato } from '../lib/cerca'
import { distanzaKm } from '../lib/geo'
import { memoria } from '../lib/memoria'
import { lottoDaRipristinare, lottoRipristinato, ricordaLottoAperto, ricordaRicerca, urlLotto } from '../lib/navigazione'
import { caricaLuoghi, luoghiCaricati } from '../lib/caricaLuoghi'
import { interpreta, testoDa, type Query } from '../lib/parser'
import { assicuraZona, riferimentoDi } from '../lib/zone'
import type { ControlloreMappa } from '../map/controllore'
import { navigate } from '../router'
import { calcolaGlobo, type Globo } from '../map/globo'

const Mappa = lazy(() => import('../components/map/Mappa'))

type Stato = 'intro' | 'volo' | 'risultati'

const ID_COMUNI = comuni.map((c) => c.id)
const DURATA_VOLO_DESKTOP = 2000
const DURATA_VOLO_MOBILE = 1200
const LARGHEZZA_PANNELLO = 440
const RAGGIO_ZONA_KM = 25
const MARGINE_SOTTO_INTRO = 20

const nomeComune = (id: ComuneId) => comuni.find((c) => c.id === id)!.nome

const leggi = (testo: string) => interpreta(testo, comuni, luoghiCaricati() ?? undefined)

/** Serve l'elenco dei comuni italiani (non ancora caricato) per capire questa ricerca? */
function serveElenco(testo: string): boolean {
  if (luoghiCaricati() || elencoNonDisponibile) return false
  const q = leggi(testo)
  return q.ignorate.length > 0 || !!q.comuneSconosciuto
}
let elencoNonDisponibile = false

/**
 * Ricerca sui lotti vivi dell'archivio: pubblicati compresi, prenotati per intero esclusi.
 * Una città fuori dalla zona demo ha i suoi lotti, generati al momento e sempre uguali.
 */
function calcola(testo: string, zona: ComuneId): Risultato {
  const q = leggi(testo)
  const riferimento = q.luogo ? riferimentoDi(q.luogo) : undefined
  if (q.luogo && riferimento?.zona) assicuraZona(q.luogo)
  const lotti = riferimento?.zona ? lottiDellaZona(riferimento.zona) : lottiAttivi()
  return cerca(q, { lotti, aziende: tutteLeAziende(), comuni, zonaPredefinita: zona, riferimento })
}

/** Dopo una pubblicazione il lotto nuovo va in cima alla lista, come risultato esatto. */
function conInCima(r: Risultato, codice: string | null): Risultato {
  const i = codice ? r.trovati.findIndex((t) => t.lotto.codice === codice) : -1
  if (i < 0) return r
  const t = { ...r.trovati[i], esatto: true }
  const resto = r.trovati.filter((_, j) => j !== i)
  return { ...r, trovati: [t, ...resto], nEsatti: r.nEsatti + (r.trovati[i].esatto ? 0 : 1) }
}

function avvio() {
  const zona = memoria.zona(ID_COMUNI) ?? 'senigallia'
  let q: string | null = null
  let nuovo: string | null = null
  try {
    const p = new URLSearchParams(window.location.search)
    q = p.get('q')?.trim() || null
    nuovo = p.get('nuovo')
  } catch {
    /* URL non leggibile: si parte normalmente */
  }
  const testo = q ?? (memoria.giaVisitato() ? nomeComune(zona) : '')
  // "?q=mattoni vicino a Torino": prima si carica l'elenco dei comuni, intanto resta il globo
  if (testo && serveElenco(testo)) return { zona, testo, stato: 'intro' as Stato, ris: null, nuovo, inAttesa: testo }
  const ris = testo ? conInCima(calcola(testo, zona), nuovo) : null
  return { zona, testo, stato: (testo ? 'risultati' : 'intro') as Stato, ris, nuovo, inAttesa: null as string | null }
}

/** Lotti della zona non trovati dalla ricerca: restano sulla mappa come punti spenti. */
function altriVicini(r: Risultato) {
  return (r.riferimento.zona ? lottiDellaZona(r.riferimento.zona) : lottiAttivi())
    .map((lotto) => ({ lotto, azienda: aziendaDi(lotto) }))
    .filter(({ azienda }) => distanzaKm(r.riferimento.lat, r.riferimento.lng, azienda.lat, azienda.lng) < RAGGIO_ZONA_KM)
}

export function Home() {
  const riduci = useRiduciMovimento()
  const desktop = useDesktop()
  const [iniziale] = useState(avvio)
  const [zona, setZona] = useState<ComuneId>(iniziale.zona)
  const [stato, setStato] = useState<Stato>(iniziale.stato)
  const [testo, setTesto] = useState(iniziale.testo)
  const [ris, setRis] = useState<Risultato | null>(iniziale.ris)
  const [evidenziato, setEvidenziato] = useState<string | null>(null)
  const [pronta, setPronta] = useState(false)
  const [attesaTile, setAttesaTile] = useState(false)
  // "Carico la mappa…" solo se l'attesa dura più di 0,6 s: con una rete normale non compare
  const [caricoMappa, setCaricoMappa] = useState(false)
  const [versione, setVersione] = useState(0)
  const [geo, setGeo] = useState<Globo | null>(null)
  /** ricerca in attesa dell'elenco dei comuni italiani */
  const [cercando, setCercando] = useState<string | null>(iniziale.inAttesa)
  // mobile, aprendo direttamente i risultati: MapLibre parte dopo il primo paint di titolo e lista,
  // perché il suo avvio tiene occupato il thread per qualche secondo. L'area resta asfalto come prima.
  const [avviaMappa, setAvviaMappa] = useState(() => desktop || iniziale.stato !== 'risultati')

  const ctrl = useRef<ControlloreMappa | null>(null)
  const introRef = useRef<HTMLDivElement>(null)
  const titoloRef = useRef<HTMLHeadingElement>(null)
  const mappaRef = useRef<HTMLDivElement>(null)
  /** risultato da portare sulla mappa appena il layout è pronto */
  const richiesta = useRef<{ r: Risultato; anima: boolean } | null>(iniziale.ris ? { r: iniziale.ris, anima: false } : null)
  const daFocalizzare = useRef(false)

  const inRisultati = stato === 'risultati' && ris !== null

  const attesaMappa = inRisultati && (!pronta || attesaTile)
  useEffect(() => {
    if (!attesaMappa) {
      setCaricoMappa(false)
      return
    }
    const t = window.setTimeout(() => setCaricoMappa(true), 600)
    return () => window.clearTimeout(t)
  }, [attesaMappa])

  const padding = useCallback(
    () => (desktop ? { top: 72, bottom: 56, left: LARGHEZZA_PANNELLO + 56, right: 56 } : { top: 36, bottom: 36, left: 24, right: 24 }),
    [desktop],
  )

  // ── geometria del globo: sfera intera sotto titolo, ricerca e contatore ──

  useLayoutEffect(() => {
    if (inRisultati) return
    const misura = () => {
      const intro = introRef.current
      const area = mappaRef.current
      if (!intro || !area) return
      const top = area.getBoundingClientRect().top
      const topLibero = intro.getBoundingClientRect().bottom - top + MARGINE_SOTTO_INTRO
      setGeo(calcolaGlobo(area.clientWidth, area.clientHeight, topLibero))
    }
    misura()
    const ro = new ResizeObserver(misura)
    if (introRef.current) ro.observe(introRef.current)
    window.addEventListener('resize', misura)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', misura)
    }
  }, [inRisultati])

  useEffect(() => {
    if (avviaMappa) return
    let cancella = () => {}
    // doppio rAF: il primo frame è stato dipinto; poi si aspetta un momento libero (max 1,5 s)
    let raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(() => {
        const avvia = () => setAvviaMappa(true)
        if (typeof window.requestIdleCallback === 'function') {
          const id = window.requestIdleCallback(avvia, { timeout: 1500 })
          cancella = () => window.cancelIdleCallback(id)
        } else {
          const id = window.setTimeout(avvia, 200)
          cancella = () => window.clearTimeout(id)
        }
      })
    })
    return () => {
      cancelAnimationFrame(raf)
      cancella()
    }
  }, [avviaMappa])

  // ── ricerca ────────────────────────────────────────────────────────────

  const esegui = useCallback(
    (t: string, anima = true) => {
      const testoPulito = t.trim() || nomeComune(zona)
      // un comune fuori dalla demo, una regione, o parole sconosciute: prima l'elenco dei comuni
      if (serveElenco(testoPulito)) {
        setCercando(testoPulito)
        caricaLuoghi()
          .catch(() => {
            elencoNonDisponibile = true // offline: si cerca con i 7 comuni della demo
          })
          .then(() => {
            setCercando(null)
            eseguiRef.current(testoPulito, anima)
          })
        return
      }
      setCercando(null)
      const r = calcola(testoPulito, zona)
      memoria.segnaVisitato()
      if (r.query.comune) {
        memoria.salvaZona(r.query.comune)
        setZona(r.query.comune)
      }
      try {
        window.history.replaceState(null, '', `/?q=${encodeURIComponent(testoPulito)}`)
      } catch {
        /* history non disponibile */
      }
      richiesta.current = { r, anima: anima && !riduci }
      daFocalizzare.current = true
      setTesto(testoPulito)
      setRis(r)
      setEvidenziato(null)
      // desktop: si resta sul globo finché il volo non arriva; mobile: lista subito, mappa in alto
      setStato(anima && !riduci && desktop && stato !== 'risultati' ? 'volo' : 'risultati')
      setVersione((v) => v + 1)
    },
    [zona, riduci, desktop, stato],
  )
  const eseguiRef = useRef(esegui)
  useEffect(() => {
    eseguiRef.current = esegui
  }, [esegui])

  // aperta con ?q= su una città fuori zona: si cerca appena arriva l'elenco dei comuni
  const avviata = useRef(false)
  useEffect(() => {
    if (!iniziale.inAttesa || avviata.current) return
    avviata.current = true
    eseguiRef.current(iniziale.inAttesa, false)
    // solo al primo montaggio
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function togliFiltro(campo: CampoFiltro) {
    if (!ris) return
    const q: Query = { ...ris.query, ignorate: [] }
    if (campo === 'comune') q.luogo = q.regione = undefined
    if (campo === 'categoria') {
      q.categoria = undefined
      q.etichetta = undefined
      q.sottotipo = undefined
    } else if (campo === 'misura') q.misura = undefined
    else if (campo === 'colore') q.colore = undefined
    else q.comune = undefined
    esegui(testoDa(q, comuni), false)
  }

  function saltaIntro() {
    if (stato === 'volo') ctrl.current?.salta()
    else esegui(nomeComune(zona), false)
  }

  // ── mappa ──────────────────────────────────────────────────────────────

  // intro: globo intero che oscilla attorno all'Italia
  useLayoutEffect(() => {
    const c = ctrl.current
    if (!c || !pronta || stato !== 'intro' || !geo) return
    c.mostraGlobo(geo)
    return () => c.fermaOscillazione()
  }, [pronta, stato, geo])

  // arrivati ai risultati il contenitore torna alla misura normale: padding e dimensioni
  // si riallineano prima del paint, così la vista non salta
  useLayoutEffect(() => {
    if (pronta && inRisultati) ctrl.current?.normalizza(padding())
  }, [pronta, inRisultati, padding])

  // porta sulla mappa l'ultima richiesta
  useEffect(() => {
    const c = ctrl.current
    const req = richiesta.current
    const area = mappaRef.current
    if (!c || !pronta || !req || !area) return
    richiesta.current = null

    const vista = { w: area.clientWidth, h: area.clientHeight }
    const max = desktop ? Infinity : MAX_INQUADRATI_MOBILE
    const cam = c.cameraPer(req.r, padding(), desktop ? 55 : 45, vista, max)
    c.mostra(req.r, altriVicini(req.r), cam.zoom, max)

    // lotto appena pubblicato: all'arrivo si accende sulla mappa
    const accendi = () => {
      const l = iniziale.nuovo ? tuttiILotti().find((x) => x.codice === iniziale.nuovo) : null
      if (l) {
        const a = aziendaDi(l)
        c.accendi(a.lng, a.lat)
      }
    }
    if (!req.anima) {
      c.vola(cam, 0).then(accendi)
      return
    }
    if (desktop) {
      c.vola(cam, DURATA_VOLO_DESKTOP).then(() => setStato('risultati'))
      return
    }
    // mobile: la mappa è già in alto e piccola; il globo si rimette intero e parte il volo corto
    c.preparaGloboIntero()
    c.vola(cam, DURATA_VOLO_MOBILE)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [versione, pronta])

  // Esc salta il volo
  useEffect(() => {
    if (stato !== 'volo') return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && ctrl.current?.salta()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [stato])

  // dopo una ricerca il focus va al titolo dei risultati
  useEffect(() => {
    if (stato === 'risultati' && daFocalizzare.current && titoloRef.current) {
      daFocalizzare.current = false
      titoloRef.current.focus({ preventScroll: true })
      if (!desktop) window.scrollTo({ top: 0 })
    }
  }, [stato, ris, desktop])

  useEffect(() => {
    ctrl.current?.evidenzia(evidenziato)
  }, [evidenziato, pronta])

  // la ricerca attiva è la destinazione di "Torna ai risultati" nella scheda lotto
  useEffect(() => {
    if (ris) ricordaRicerca(`/?q=${encodeURIComponent(testo)}`)
  }, [ris, testo])

  // clic su una colonna: si apre la scheda del lotto
  const onClickLotto = useCallback((id: string) => {
    const lotto = tuttiILotti().find((l) => l.id === id)
    if (!lotto) return
    ricordaLottoAperto(id)
    navigate(urlLotto(lotto.codice))
  }, [])

  // tornando dalla scheda: la lista si riapre sulla card da cui si era partiti, con il focus
  useEffect(() => {
    if (!inRisultati) return
    const id = lottoDaRipristinare()
    if (!id) return
    // si cancella solo a ripristino fatto: se l'effetto viene annullato e rieseguito (StrictMode) non si perde
    const raf = requestAnimationFrame(() => {
      lottoRipristinato()
      const card = document.getElementById(`card-${id}`)
      if (!card) return
      card.scrollIntoView({ block: 'center' })
      card.querySelector<HTMLAnchorElement>('h3 a')?.focus({ preventScroll: true })
      setEvidenziato(id)
    })
    return () => cancelAnimationFrame(raf)
    // solo al montaggio della lista
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inRisultati])

  const onPronta = useCallback((c: ControlloreMappa) => {
    ctrl.current = c
    setPronta(true)
  }, [])

  // ── layout ─────────────────────────────────────────────────────────────

  // mobile, risultati: mappa in alto (40svh) e lista sotto; altrimenti mappa fissa a tutto schermo
  // su mobile, in intro, la mappa si ferma sopra la barra del menu (64 px): globo e attribuzione restano visibili
  const classeArea = inRisultati && !desktop
    ? 'relative order-1 h-[40svh] border-b-2 border-asfalto'
    : `fixed inset-x-0 top-[34px] ${desktop ? 'bottom-0' : 'bottom-16'}`

  return (
    <div className="flex flex-col">
      <DemoBanner />

      {!inRisultati && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 top-[34px] z-10">
          <header className="pointer-events-auto relative flex items-center justify-between gap-4 px-4 pt-3 sm:px-8 sm:pt-4">
            <span className="font-display text-[20px] font-black font-wide tracking-tight">Avanzi</span>
            <div className="flex items-center gap-3">
            <MenuApp className={stato === 'volo' ? 'invisible' : ''} />
            {/* in volo la mappa è scura: il pulsante diventa giallo per restare visibile */}
            <Button variante={stato === 'volo' ? 'primario' : 'contorno'} icona={<IconaAvanti />} onClick={saltaIntro}>
              Salta intro
            </Button>
            </div>
          </header>
          <div className={`transition-opacity duration-300 ${stato === 'volo' ? 'opacity-0' : 'opacity-100'}`} inert={stato === 'volo'}>
            <Intro ref={introRef} onCerca={(t) => esegui(t)} />
            {cercando && <InCerca testo={cercando} className="mx-auto mt-3 max-w-[760px] px-4 text-center" />}
          </div>
          {stato === 'volo' && (
            <p aria-live="polite" className="sr-only">
              Volo verso {ris?.riferimento.nome}. Premi Esc o Salta intro per arrivare subito.
            </p>
          )}
        </div>
      )}

      {inRisultati && (
        <main
          className={
            desktop
              ? 'fixed bottom-0 left-0 top-[34px] z-10 overflow-y-auto border-r-2 border-asfalto bg-cemento px-6 pt-5 pb-10'
              : 'order-2 px-4 pt-4 pb-24'
          }
          style={desktop ? { width: LARGHEZZA_PANNELLO } : undefined}
        >
          {/* desktop: il menu sta nel pannello, accanto al logo, solo icone (il pannello è stretto) */}
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="font-display text-[20px] font-black font-wide tracking-tight">Avanzi</p>
            <MenuApp compatto />
          </div>
          {cercando && <InCerca testo={cercando} className="mb-4" />}
          {iniziale.nuovo && ris?.trovati[0]?.lotto.codice === iniziale.nuovo && <Pubblicato codice={iniziale.nuovo} comune={ris.riferimento.nome} />}
          <Risultati
            ris={ris}
            testo={testo}
            evidenziato={evidenziato}
            onEvidenzia={setEvidenziato}
            onCerca={(t) => esegui(t)}
            onTogliFiltro={togliFiltro}
            maxInMappa={desktop ? undefined : MAX_INQUADRATI_MOBILE}
            titoloRef={titoloRef}
          />
        </main>
      )}

      <div ref={mappaRef} className={`${classeArea} z-0 overflow-hidden ${inRisultati ? 'bg-asfalto' : ''}`}>
        {/* immagine statica del globo finché MapLibre non è pronta, poi dissolvenza */}
        {geo && !inRisultati && <GloboStatico geo={geo} visibile={!pronta} />}
        <div
          className={`absolute inset-x-0 top-0 transition-opacity duration-700 ${pronta ? 'opacity-100' : 'opacity-0'}`}
          style={{ height: '100%' }}
        >
          {avviaMappa && (
            <Suspense fallback={null}>
              <Mappa riduci={riduci} cooperativa={!desktop} className="size-full" onPronta={onPronta} onClickLotto={onClickLotto} onAttesaTile={setAttesaTile} />
            </Suspense>
          )}
        </div>
        {/* città nuova o rete lenta: la mappa resta scura finché non arrivano le strade */}
        {inRisultati && (
          <p
            role="status"
            className={`pointer-events-none absolute bottom-10 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full border border-cemento/25 bg-asfalto/90 px-3.5 py-1.5 text-[14px] text-cemento transition-opacity duration-300 ${caricoMappa ? 'opacity-100' : 'opacity-0'}`}
            style={{ left: desktop ? `calc(${LARGHEZZA_PANNELLO}px + (100% - ${LARGHEZZA_PANNELLO}px) / 2)` : '50%' }}
          >
            <span aria-hidden="true" className="size-2 rounded-full bg-giallo motion-safe:animate-pulse" />
            {caricoMappa ? 'Carico la mappa…' : ''}
          </p>
        )}
      </div>
    </div>
  )
}

/** Mentre arriva l'elenco dei comuni italiani (una frazione di secondo, la prima volta). */
function InCerca({ testo, className = '' }: { testo: string; className?: string }) {
  return (
    <p role="status" className={`text-[15px] font-semibold ${className}`}>
      Cerco «{testo}» fra i comuni italiani…
    </p>
  )
}

/** Conferma dopo la pubblicazione: il lotto è in cima alla lista e il contatore sale. */
function Pubblicato({ codice, comune }: { codice: string; comune: string }) {
  const archivio = useArchivio()
  return (
    <section role="status" className="mb-6 rounded-etichetta border-2 border-asfalto bg-giallo p-4">
      <p className="font-display text-[19px] leading-tight font-extrabold font-semiwide">Pubblicato!</p>
      <p className="mt-1 text-[15px] leading-snug">
        <span className="num font-semibold">{codice}</span> è in cima alla lista e sulla mappa, visibile a chi cerca vicino a {comune}.
      </p>
      <KgCounter kg={kgInCircolo(archivio)} taglia="riga" etichetta="rimessi in circolo" className="mt-3" />
    </section>
  )
}
