// Tutto ciò che si muove sulla mappa vive qui, fuori da React:
// oscillazione del globo, pulsazioni, volo, colonne. React chiama solo metodi.
import type { FeatureCollection } from 'geojson'
import { Map as MapLibre, type GeoJSONSource, type LngLatLike, type PaddingOptions } from 'maplibre-gl'
import type { Azienda, Lotto, PuntoDecorativo } from '../data/types'
import { daInquadrare, type Risultato } from '../lib/cerca'
import { aggiungiColonne, altriGeoJSON, colonneGeoJSON, SORGENTE_ALTRI, SORGENTE_COLONNE } from './colonne'
import { LAT_ITALIA, LNG_ITALIA, OSCILLAZIONE_GRADI, OSCILLAZIONE_PERIODO_S, type Globo } from './globo'
import { aggiungiPunti, avviaPulsazioni, puntiGeoJSON, SORGENTE_PUNTI } from './punti'
import { COLORI, creaStile, PROIEZIONE_GLOBO } from './stile'
import './worker'

const DURATA_CRESCITA_MS = 700
/** accensione di un lotto appena pubblicato: tre anelli che si allargano */
const ACCENSIONE_CICLI = 3
const ACCENSIONE_CICLO_MS = 800
/** dopo un trascinamento in intro, il globo torna sull'Italia dopo questa pausa */
const RITORNO_DOPO_MS = 1500
const DURATA_RITORNO_MS = 1000
/** inerzia del trascinamento in intro: più spinta e più velocità dei valori normali (0,3 / 1400 / 2500) */
const INERZIA_INTRO = { linearity: 0.5, maxSpeed: 2600, deceleration: 1800 }
const ZOOM_MAX_ZONA = 14
const BEARING_ZONA = -20
/** sotto questo zoom le colonne si ingrandiscono in proporzione, fino a SCALA_MAX volte */
const ZOOM_MISURE_REALI = 12.5
const SCALA_MAX = 10
/** primo layer di etichette: colonne e punti vanno sotto, i nomi dei comuni restano leggibili */
const PRIMA_ETICHETTA = 'etichette-strade'

export interface Camera {
  center: LngLatLike
  zoom: number
  pitch: number
  bearing: number
  padding: PaddingOptions
}

export interface Opzioni {
  container: HTMLElement
  riduci: boolean
  /** mobile: la mappa sta in una pagina che scorre, serve il gesto a due dita */
  cooperativa: boolean
  decorativi: PuntoDecorativo[]
  lotti: Lotto[]
  aziendaDi: (l: Lotto) => Azienda
  onClickLotto: (id: string) => void
  onPronta: () => void
}

export class ControlloreMappa {
  readonly map: MapLibre
  private o: Opzioni
  private riduci: boolean
  private rafOscillazione = 0
  private fermaPulsazioni: (() => void) | null = null
  private evidenziato: string | null = null
  private destinazione: Camera | null = null
  private rafCrescita = 0
  private rafAccensione = 0
  private pesoMax: number
  private pronta = false
  private inIntro = false
  private timerRitorno = 0

  constructor(o: Opzioni) {
    this.o = o
    this.riduci = o.riduci
    this.pesoMax = Math.max(...o.lotti.map((l) => l.pesoKg))
    this.map = new MapLibre({
      container: o.container,
      style: creaStile(),
      center: [LNG_ITALIA, LAT_ITALIA],
      zoom: 1.5,
      pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
      maxPitch: 60,
      fadeDuration: 0,
      attributionControl: { compact: true },
      renderWorldCopies: false,
      cooperativeGestures: o.cooperativa,
      locale: {
        'CooperativeGesturesHandler.WindowsHelpText': 'Usa Ctrl + rotella per zoomare la mappa',
        'CooperativeGesturesHandler.MacHelpText': 'Usa ⌘ + rotella per zoomare la mappa',
        'CooperativeGesturesHandler.MobileHelpText': 'Usa due dita per muovere la mappa',
        'AttributionControl.ToggleAttribution': 'Mostra o nascondi i crediti della mappa',
      },
    })
    this.map.keyboard.disable() // la mappa non ruba le frecce alla pagina
    // solo in sviluppo: accesso da console/Playwright per misure e debug
    if (import.meta.env.DEV) Object.assign(window, { __mappa: this.map, __ctrl: this })

    this.map.on('load', () => {
      aggiungiPunti(this.map, puntiGeoJSON(o.decorativi, o.lotti, o.aziendaDi), PRIMA_ETICHETTA)
      aggiungiColonne(this.map, PRIMA_ETICHETTA)
      this.aggiungiAccensione()
      this.map.setGlobalStateProperty('anima', this.riduci ? 0 : 1)
      if (!this.riduci) this.fermaPulsazioni = avviaPulsazioni(this.map)
      this.collegaEventi()
      this.pronta = true
      o.onPronta()
    })
  }

  // ── Intro: globo intero che oscilla attorno all'Italia ───────────────────────

  /** Sfera intera sotto titolo e ricerca, Italia al centro all'avvio. Si può solo trascinare. */
  mostraGlobo(g: Globo) {
    this.inIntro = true
    this.proiezioneGlobo(true)
    this.interazioni(false)
    // solo trascinamento: niente zoom (la rotellina serve a scorrere), niente rotazione o pitch
    this.map.dragPan.enable(INERZIA_INTRO)
    // su mobile il gesto a un dito deve ruotare il globo, non chiedere "usa due dita"
    this.map.cooperativeGestures.disable()
    window.clearTimeout(this.timerRitorno)
    this.map.jumpTo({
      center: [LNG_ITALIA, LAT_ITALIA],
      zoom: g.zoom,
      pitch: 0,
      bearing: 0,
      padding: { top: g.paddingTop, bottom: g.paddingBottom, left: 0, right: 0 },
    })
    this.avviaOscillazione()
  }

  /** Oscillazione di ±25° attorno all'Italia; parte con l'Italia al centro (seno = 0). */
  private avviaOscillazione() {
    this.fermaOscillazione()
    if (this.riduci) return
    const inizio = performance.now()
    const passo = (ora: number) => {
      this.rafOscillazione = requestAnimationFrame(passo)
      if (document.hidden) return
      const t = (ora - inizio) / 1000
      const lng = LNG_ITALIA + OSCILLAZIONE_GRADI * Math.sin((2 * Math.PI * t) / OSCILLAZIONE_PERIODO_S)
      this.map.jumpTo({ center: [lng, LAT_ITALIA] })
    }
    this.rafOscillazione = requestAnimationFrame(passo)
  }

  fermaOscillazione() {
    cancelAnimationFrame(this.rafOscillazione)
    this.rafOscillazione = 0
  }

  /** Esce dall'intro: niente oscillazione, mappa di nuovo esplorabile. */
  esciDallIntro() {
    this.inIntro = false
    window.clearTimeout(this.timerRitorno)
    this.fermaOscillazione()
    this.interazioni(true)
    if (this.o.cooperativa) this.map.cooperativeGestures.enable()
  }

  /** Trascinamento in intro: l'oscillazione si ferma, poi il globo torna sull'Italia. */
  private dopoTrascinamento = () => {
    window.clearTimeout(this.timerRitorno)
    // con reduced-motion niente ritorno automatico: il globo resta dove l'ha lasciato chi guarda
    if (!this.inIntro || this.riduci) return
    this.timerRitorno = window.setTimeout(() => {
      if (!this.inIntro) return
      this.map.once('moveend', () => this.inIntro && !this.destinazione && this.avviaOscillazione())
      this.map.easeTo({ center: [LNG_ITALIA, LAT_ITALIA], duration: DURATA_RITORNO_MS, essential: false })
    }, RITORNO_DOPO_MS)
  }

  /** Mobile: prima del volo il globo si rimette intero nel riquadro (piccolo) della mappa. */
  preparaGloboIntero() {
    if (this.map.getZoom() > 5) return
    const { clientWidth: w, clientHeight: h } = this.o.container
    const d = 0.9 * Math.min(w, h)
    this.map.jumpTo({
      center: [LNG_ITALIA, LAT_ITALIA],
      zoom: Math.log2((d * Math.PI) / 512),
      pitch: 0,
      bearing: 0,
      padding: { top: 0, bottom: 0, left: 0, right: 0 },
    })
  }

  private interazioni(attive: boolean) {
    const m = this.map
    for (const h of [m.dragPan, m.scrollZoom, m.boxZoom, m.dragRotate, m.doubleClickZoom, m.touchZoomRotate, m.touchPitch]) {
      if (attive) h.enable()
      else h.disable()
    }
  }

  private collegaEventi() {
    const m = this.map
    // l'oscillazione va fermata già alla pressione: il suo jumpTo a ogni frame
    // interromperebbe il gesto prima che il trascinamento parta
    const premi = () => {
      if (!this.inIntro) return
      window.clearTimeout(this.timerRitorno)
      this.map.stop()
      this.fermaOscillazione()
    }
    m.on('mousedown', premi)
    m.on('touchstart', premi)
    // al rilascio (con o senza trascinamento) parte il conto alla rovescia per il ritorno
    m.on('mouseup', this.dopoTrascinamento)
    m.on('touchend', this.dopoTrascinamento)
    m.on('dragend', this.dopoTrascinamento)
    // un clic durante il volo lo salta
    m.on('mousedown', () => this.destinazione && this.salta())
    m.on('touchstart', () => this.destinazione && this.salta())

    m.on('click', ['colonne', 'colonne-tenui'], (e) => {
      const id = e.features?.[0]?.properties?.id
      if (typeof id === 'string') this.o.onClickLotto(id)
    })
    m.on('mouseenter', ['colonne', 'colonne-tenui'], () => (m.getCanvas().style.cursor = 'pointer'))
    m.on('mouseleave', ['colonne', 'colonne-tenui'], () => (m.getCanvas().style.cursor = ''))
  }

  // ── Lotti pubblicati: punti aggiornati e accensione ─────────────────────────

  /** I lotti sono cambiati (pubblicato un lotto, prenotato tutto un lotto): ridisegna i punti. */
  aggiornaPunti(lotti: Lotto[]) {
    this.o.lotti = lotti
    this.pesoMax = Math.max(...lotti.map((l) => l.pesoKg))
    if (this.pronta) this.setDati(SORGENTE_PUNTI, puntiGeoJSON(this.o.decorativi, lotti, this.o.aziendaDi))
  }

  private aggiungiAccensione() {
    const vuoto: FeatureCollection = { type: 'FeatureCollection', features: [] }
    this.map.addSource('accensione', { type: 'geojson', data: vuoto })
    const t = ['global-state', 'accensione'] as const
    this.map.addLayer({
      id: 'accensione-anello',
      type: 'circle',
      source: 'accensione',
      paint: {
        'circle-color': 'rgba(0,0,0,0)',
        'circle-stroke-color': COLORI.giallo,
        'circle-stroke-width': 3,
        'circle-radius': ['+', 10, ['*', 38, [...t]]],
        'circle-stroke-opacity': ['*', 0.95, ['-', 1, [...t]]],
      },
    }, PRIMA_ETICHETTA)
    this.map.addLayer({
      id: 'accensione-punto',
      type: 'circle',
      source: 'accensione',
      paint: { 'circle-radius': 7, 'circle-color': COLORI.giallo, 'circle-stroke-color': COLORI.asfalto, 'circle-stroke-width': 2.5 },
    }, PRIMA_ETICHETTA)
  }

  /** Un lotto appena pubblicato "si accende": tre anelli che si allargano, poi resta il punto. */
  accendi(lng: number, lat: number) {
    if (!this.pronta) return
    this.setDati('accensione', { type: 'FeatureCollection', features: [{ type: 'Feature', geometry: { type: 'Point', coordinates: [lng, lat] }, properties: {} }] })
    cancelAnimationFrame(this.rafAccensione)
    if (this.riduci) {
      this.map.setGlobalStateProperty('accensione', 0.45) // anello fermo, ben visibile
      return
    }
    const inizio = performance.now()
    const passo = (ora: number) => {
      const trascorso = ora - inizio
      const fine = trascorso >= ACCENSIONE_CICLI * ACCENSIONE_CICLO_MS
      this.map.setGlobalStateProperty('accensione', fine ? 1 : (trascorso % ACCENSIONE_CICLO_MS) / ACCENSIONE_CICLO_MS)
      if (!fine) this.rafAccensione = requestAnimationFrame(passo)
    }
    this.rafAccensione = requestAnimationFrame(passo)
  }

  // ── Risultati ────────────────────────────────────────────────────────────

  /**
   * Camera che inquadra il comune di riferimento e i risultati più vicini.
   * `vista` è la parte visibile della mappa (durante l'intro il contenitore è più alto dello schermo).
   */
  cameraPer(r: Risultato, padding: PaddingOptions, pitch: number, vista: { w: number; h: number }, max = Infinity): Camera {
    // risultati da inquadrare (esatti entro 25 km, vedi daInquadrare); il padding tiene conto del pannello
    const scelti = daInquadrare(r, max)
    const punti: [number, number][] = scelti.length
      ? scelti.map((t) => [t.azienda.lng, t.azienda.lat])
      : [[r.riferimento.lng, r.riferimento.lat]]
    // più pitch = più prospettiva: la parte bassa dello schermo si ingrandisce, serve più margine
    const margine = pitch > 50 ? 0.75 : 0.7
    const { center, zoom } = this.inquadra(punti, padding, BEARING_ZONA, margine, vista)
    return { center, zoom, bearing: BEARING_ZONA, pitch, padding }
  }

  /**
   * Centro e zoom che contengono i punti, calcolati in Mercator.
   * Non uso cameraForBounds: vale per la camera attuale (il globo), non per quella d'arrivo.
   */
  private inquadra(
    punti: [number, number][],
    p: PaddingOptions,
    bearingGradi: number,
    margine: number,
    vista: { w: number; h: number },
  ): { center: [number, number]; zoom: number } {
    const merc = punti.map(([lng, lat]) => {
      const s = Math.sin((lat * Math.PI) / 180)
      return [(lng + 180) / 360, 0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)]
    })
    const cx = (Math.min(...merc.map((m) => m[0])) + Math.max(...merc.map((m) => m[0]))) / 2
    const cy = (Math.min(...merc.map((m) => m[1])) + Math.max(...merc.map((m) => m[1]))) / 2
    // estensione nel sistema ruotato dello schermo (bearing)
    const a = (bearingGradi * Math.PI) / 180
    let w = 0
    let h = 0
    for (const [x, y] of merc) {
      const dx = x - cx
      const dy = y - cy
      w = Math.max(w, Math.abs(dx * Math.cos(a) + dy * Math.sin(a)))
      h = Math.max(h, Math.abs(-dx * Math.sin(a) + dy * Math.cos(a)))
    }
    // margine minimo (~1,5 km): un solo punto non deve dare zoom 22
    const minimo = 1.5 / 40_075
    w = Math.max(w, minimo)
    h = Math.max(h, minimo)
    const liberiX = Math.max(80, vista.w - (p.left ?? 0) - (p.right ?? 0))
    const liberiY = Math.max(80, vista.h - (p.top ?? 0) - (p.bottom ?? 0))
    // mondo = 512 px a zoom 0
    const zoom = Math.log2(Math.min(liberiX / (2 * w * 512), liberiY / (2 * h * 512)) * margine)
    const lng = cx * 360 - 180
    const lat = (Math.atan(Math.sinh(Math.PI * (1 - 2 * cy))) * 180) / Math.PI
    return { center: [lng, lat], zoom: Math.min(ZOOM_MAX_ZONA, zoom) }
  }

  /** Mette in mappa colonne e punti per il risultato; le colonne partono basse. */
  mostra(r: Risultato, altriDellaZona: { lotto: Lotto; azienda: Azienda }[], zoomArrivo: number, maxInquadrati = Infinity) {
    const trovati = r.trovati.map(({ lotto, azienda }) => ({ lotto, azienda }))
    const idTrovati = new Set(trovati.map((t) => t.lotto.id))
    const scala = Math.min(SCALA_MAX, Math.max(1, 2 ** (ZOOM_MISURE_REALI - zoomArrivo)))
    const inMappa = new Set(daInquadrare(r, maxInquadrati).map((t) => t.lotto.id))
    this.setDati(SORGENTE_COLONNE, colonneGeoJSON(trovati, this.pesoMax, scala, inMappa))
    this.setDati(SORGENTE_ALTRI, altriGeoJSON(altriDellaZona.filter((a) => !idTrovati.has(a.lotto.id))))
    this.evidenziato = null
    this.map.setGlobalStateProperty('crescita', this.riduci ? 1 : 0)
  }

  private setDati(sorgente: string, dati: FeatureCollection) {
    const s = this.map.getSource(sorgente) as GeoJSONSource | undefined
    s?.setData(dati)
  }

  /** Fa crescere le colonne da 0 all'altezza piena. */
  cresci() {
    cancelAnimationFrame(this.rafCrescita)
    if (this.riduci) {
      this.map.setGlobalStateProperty('crescita', 1)
      return
    }
    const inizio = performance.now()
    const passo = (ora: number) => {
      const p = Math.min(1, (ora - inizio) / DURATA_CRESCITA_MS)
      this.map.setGlobalStateProperty('crescita', 1 - (1 - p) ** 3)
      if (p < 1) this.rafCrescita = requestAnimationFrame(passo)
    }
    this.rafCrescita = requestAnimationFrame(passo)
  }

  /**
   * Proiezione: a interpolazione (globo → Mercator) per intro e volo; Mercator puro all'arrivo.
   * Con la proiezione a interpolazione MapLibre non trova le estrusioni sotto il puntatore
   * (il clic sulle colonne non funzionerebbe); oltre zoom 8 le due sono identiche a vista.
   */
  private proiezioneGlobo(globo: boolean) {
    const voluta = globo ? PROIEZIONE_GLOBO : { type: 'mercator' as const }
    if (JSON.stringify(this.map.getProjection()) !== JSON.stringify(voluta)) this.map.setProjection(voluta)
  }

  private arrivato() {
    if (this.map.getZoom() >= 8) this.proiezioneGlobo(false)
    this.cresci()
  }

  /** Vola alla camera. Si risolve all'arrivo (o quando il volo viene saltato). */
  vola(cam: Camera, durataMs: number): Promise<void> {
    this.esciDallIntro()
    if (this.riduci || durataMs === 0) {
      this.map.jumpTo(cam)
      this.arrivato()
      return Promise.resolve()
    }
    // si parte (anche) dal globo: serve la proiezione a interpolazione per la transizione
    this.proiezioneGlobo(true)
    this.destinazione = cam
    return new Promise((risolvi) => {
      this.map.once('moveend', () => {
        this.destinazione = null
        this.arrivato()
        risolvi()
      })
      this.map.flyTo({ ...cam, duration: durataMs, essential: false, curve: 1.6 })
    })
  }

  /** Salta il volo in corso: arrivo immediato. */
  salta() {
    const d = this.destinazione
    if (!d) return
    this.destinazione = null
    this.map.stop() // emette moveend → risolve la promessa di vola()
    this.map.jumpTo(d)
    if (this.map.getZoom() >= 8) this.proiezioneGlobo(false) // allo stop eravamo ancora a metà strada
  }

  /** Riallinea padding e dimensioni quando il contenitore torna alla misura normale. */
  normalizza(padding: PaddingOptions) {
    this.map.setPadding(padding)
    this.map.resize()
  }

  evidenzia(id: string | null) {
    if (this.evidenziato === id) return
    if (this.evidenziato) this.map.setFeatureState({ source: SORGENTE_COLONNE, id: this.evidenziato }, { evidenziato: false })
    if (id) this.map.setFeatureState({ source: SORGENTE_COLONNE, id }, { evidenziato: true })
    this.evidenziato = id
  }

  setRiduci(riduci: boolean) {
    if (riduci === this.riduci) return
    this.riduci = riduci
    if (!this.pronta) return // al load viene letto this.riduci
    this.map.setGlobalStateProperty('anima', riduci ? 0 : 1)
    if (riduci) {
      this.fermaPulsazioni?.()
      this.fermaPulsazioni = null
      this.fermaOscillazione()
    } else if (!this.fermaPulsazioni) {
      this.fermaPulsazioni = avviaPulsazioni(this.map)
    }
  }

  /** Arrivati a destinazione ma con le tile ancora in arrivo: la mappa è scura e vuota. */
  inAttesaDiTile(): boolean {
    return !this.map.isMoving() && !this.map.areTilesLoaded()
  }

  distruggi() {
    window.clearTimeout(this.timerRitorno)
    this.fermaPulsazioni?.()
    this.fermaOscillazione()
    cancelAnimationFrame(this.rafCrescita)
    cancelAnimationFrame(this.rafAccensione)
    this.map.remove()
  }
}
