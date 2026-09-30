/// <reference lib="dom" />
// Registra il video demo del case study sul dev server locale e crea docs/demo.mp4 e docs/demo.gif.
// Uso: npm run dev (in un altro terminale), poi npm run demo
//      npm run demo -- --solo-gif   rifà solo la GIF dal docs/demo.mp4 esistente
// Serve ffmpeg nel PATH. Non pubblica nulla: tutto resta in locale.
//
// I fotogrammi arrivano dallo screencast di Chrome (JPEG di buona qualità) e ffmpeg li monta a 30 fps:
// la registrazione video interna di Playwright comprime troppo per una mappa in movimento.

import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { chromium, type Locator, type Page } from 'playwright-core'

// pallino giallo con bordo scuro che segue il mouse; si stringe al clic
const CURSORE_FINTO = `
addEventListener('DOMContentLoaded', () => {
  const d = document.createElement('div')
  d.style.cssText = 'position:fixed;left:0;top:0;width:26px;height:26px;margin:-13px 0 0 -13px;border-radius:50%;' +
    'background:rgba(255,194,26,.85);border:3px solid #1C1C1A;box-shadow:0 0 0 2px rgba(237,235,230,.9);' +
    'pointer-events:none;z-index:2147483647;transition:transform .12s ease;transform:translate(-100px,-100px)'
  document.body.appendChild(d)
  let [x, y] = (sessionStorage.getItem('demo:cursore') ?? '-100,-100').split(',').map(Number), s = 1
  const aggiorna = () => (d.style.transform = 'translate(' + x + 'px,' + y + 'px) scale(' + s + ')')
  aggiorna()
  addEventListener('mousemove', (e) => { x = e.clientX; y = e.clientY; aggiorna(); sessionStorage.setItem('demo:cursore', x + ',' + y) }, true)
  addEventListener('mousedown', () => { s = 0.7; aggiorna() }, true)
  addEventListener('mouseup', () => { s = 1; aggiorna() }, true)
})
`

const BASE = process.env.DEMO_URL ?? 'http://localhost:5173'
const W = 1440
const H = 900
const MP4 = 'docs/demo.mp4'
const GIF = 'docs/demo.gif'
const GIF_MAX_BYTE = 8_000_000

// ── il percorso ────────────────────────────────────────────────────────────

const inizio = Date.now()
const tappa = (nome: string) => console.log(`${((Date.now() - inizio) / 1000).toFixed(1).padStart(5)} s  ${nome}`)

async function percorso(page: Page) {
  const c = new Cursore(page)
  tappa('globo')
  // parte a destra, lontano dal globo (sopra sembrerebbe un segnaposto)
  await c.muovi(W - 260, H - 220, 10)

  // globo
  await pausa(3000)

  // ricerca e volo su Senigallia
  tappa('ricerca')
  const ricercaIntro = page.locator('input[type=search]').first()
  await c.clic(ricercaIntro)
  await c.scrivi('gres 60x60 grigio vicino a Senigallia')
  await pausa(600)
  await c.clic(page.getByRole('button', { name: 'Cerca', exact: true }).first())
  // subito fuori dalla mappa, verso il pannello dei risultati: fermo sulla mappa sembrerebbe indicare qualcosa
  await c.muovi(220, 560, 900)
  await attendiRisultati(page)
  await pausa(1000)

  // passa su 2-3 colonne
  tappa('colonne')
  for (const [x, y] of await puntiColonne(page, 3)) {
    await c.muovi(x, y, 650)
    await pausa(450)
  }

  // apre una card
  tappa('scheda')
  const card = page.locator('main ol li h3 a').first()
  await c.clic(card)
  await page.waitForURL(/\/lotto\//)
  await pausa(900)

  // ruota il bancale 3D
  const bancale = page.locator('main canvas').first()
  await scorriFino(bancale)
  await pausa(600)
  const box = (await bancale.boundingBox())!
  await c.muovi(box.x + box.width * 0.6, box.y + box.height * 0.5, 500)
  await page.mouse.down()
  await c.muovi(box.x + box.width * 0.25, box.y + box.height * 0.45, 1300)
  await page.mouse.up()
  await pausa(800)

  // torna ai risultati
  tappa('torna')
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }))
  await pausa(500)
  await c.clic(page.getByRole('link', { name: 'Torna ai risultati' }))
  await attendiRisultati(page)
  await pausa(600)

  // cerca qualcosa che non c'è e salva l'avviso
  tappa('avviso')
  const ricerca = page.getByLabel('Nuova ricerca')
  await c.clic(ricerca)
  await ricerca.fill('')
  await c.scrivi('gres 80x80 grigio perla vicino a Senigallia')
  await pausa(500)
  await page.keyboard.press('Enter')
  await attendiRisultati(page)
  await pausa(1300)
  await c.clic(page.getByRole('button', { name: /Avvisami quando arriva/ }))
  await pausa(1800)

  // pubblica un lotto che corrisponde (il comune di ritiro è già Senigallia)
  tappa('pubblica')
  await c.clic(page.locator('main').getByRole('link', { name: 'Pubblica' }).first())
  await page.waitForURL(/pubblica/)
  await pausa(500)
  await c.clic(page.locator('label:has(input[name=foto-esempio])').first())
  await pausa(500)
  await avanti(c, page)
  await c.clic(page.getByRole('radiogroup', { name: 'Formato' }).locator('label', { hasText: '80x80' }))
  await pausa(300)
  await c.clic(page.getByRole('radiogroup', { name: 'Colore' }).locator('label', { hasText: 'grigio perla' }))
  await pausa(500)
  await avanti(c, page)
  await avanti(c, page)
  await avanti(c, page)
  await pausa(700)
  await c.clic(page.getByRole('button', { name: 'Pubblica', exact: true }))
  await page.waitForURL(/nuovo=/)

  // notifica dell'avviso
  tappa('notifica')
  await page.locator('[aria-live=polite] [role=status]').first().waitFor({ timeout: 15000 })
  await attendiRisultati(page)
  await pausa(2200)

  // prenota il ritiro del lotto appena pubblicato → QR
  tappa('ritiro')
  await c.clic(page.locator('main ol li h3 a').first())
  await page.waitForURL(/\/lotto\//)
  await pausa(800)
  await c.clic(page.locator('main').getByRole('button', { name: /Prenota il ritiro/ }).first())
  await page.waitForURL(/ritiro/)
  await pausa(700)
  const conferma = page.getByRole('button', { name: 'Conferma il ritiro' })
  await scorriFino(conferma)
  await pausa(200)
  await c.clic(conferma)
  await page.locator('main svg path').first().waitFor()
  await pausa(2200)

  // di nuovo il globo, poi l'esempio fuori zona: volo su Torino
  tappa('torino')
  await page.evaluate(() => localStorage.removeItem('avanzi:visitato'))
  await page.goto(BASE)
  await attendiMappa(page)
  await pausa(1200)
  await c.clic(page.getByRole('button', { name: 'mattoni vicino a Torino' }))
  await attendiRisultati(page)
  await pausa(2000)
  tappa('fine')
}

async function avanti(c: Cursore, page: Page) {
  await c.clic(page.getByRole('button', { name: 'Avanti' }))
  await pausa(300)
}

// ── attese ─────────────────────────────────────────────────────────────────

const pausa = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function attendiMappa(page: Page) {
  await page.waitForFunction(() => {
    const m = (window as unknown as { __mappa?: { loaded(): boolean; isMoving(): boolean } }).__mappa
    return !!m && m.loaded() && !m.isMoving()
  }, null, { timeout: 30000 })
}

/** Lista visibile e volo finito. */
async function attendiRisultati(page: Page) {
  await page.locator('main ol li').first().waitFor({ timeout: 30000 })
  await pausa(300)
  await attendiMappa(page)
}

/**
 * Punti sopra qualche colonna visibile, in coordinate della pagina: si parte dalla base della colonna
 * e si sale finché la mappa conferma che sotto il cursore c'è davvero una colonna.
 */
async function puntiColonne(page: Page, n: number): Promise<[number, number][]> {
  return page.evaluate((n) => {
    type F = { geometry: { coordinates: number[][][] } }
    const m = (window as unknown as {
      __mappa: { queryRenderedFeatures(a: object | number[], o?: object): F[]; project(p: number[]): { x: number; y: number }; getCanvas(): HTMLCanvasElement }
    }).__mappa
    const r = m.getCanvas().getBoundingClientRect()
    const punti: [number, number][] = []
    for (const f of m.queryRenderedFeatures({ layers: ['colonne'] })) {
      const co = f.geometry.coordinates[0]
      const p = m.project([co.reduce((s, x) => s + x[0], 0) / co.length, co.reduce((s, x) => s + x[1], 0) / co.length])
      const dy = [-8, -20, -35, -50].find((d) => m.queryRenderedFeatures([p.x, p.y + d], { layers: ['colonne'] }).length > 0)
      if (dy === undefined) continue
      const pt: [number, number] = [r.left + p.x, r.top + p.y + dy]
      // colonne distinte: almeno 60 px l'una dall'altra
      if (punti.every(([x, y]) => Math.hypot(x - pt[0], y - pt[1]) > 60)) punti.push(pt)
      if (punti.length === n) break
    }
    return punti
  }, n)
}

async function scorriFino(l: Locator) {
  await l.evaluate((el) => el.scrollIntoView({ behavior: 'smooth', block: 'center' }))
  await pausa(900)
}

// ── cursore finto ──────────────────────────────────────────────────────────

class Cursore {
  x = W / 2
  y = H / 2
  page: Page
  constructor(page: Page) {
    this.page = page
  }

  /** Movimento fluido (ease-in-out) a ~60 passi al secondo. */
  async muovi(x: number, y: number, ms = 700) {
    const passi = Math.max(1, Math.round(ms / 16))
    const [x0, y0] = [this.x, this.y]
    for (let i = 1; i <= passi; i++) {
      const t = i / passi
      const e = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2
      await this.page.mouse.move(x0 + (x - x0) * e, y0 + (y - y0) * e)
      await pausa(16)
    }
    this.x = x
    this.y = y
  }

  async clic(l: Locator) {
    await l.scrollIntoViewIfNeeded()
    const b = (await l.boundingBox())!
    await this.muovi(b.x + b.width / 2, b.y + b.height / 2, 450)
    await pausa(120)
    await this.page.mouse.down()
    await pausa(80)
    await this.page.mouse.up()
    await pausa(150)
  }

  /** Lettera per lettera, con un ritmo non meccanico (ma sempre uguale). */
  async scrivi(testo: string) {
    let i = 0
    for (const ch of testo) {
      await this.page.keyboard.type(ch)
      await pausa(ch === ' ' ? 95 : 38 + ((i++ * 37) % 36))
    }
  }
}


// ── cattura e montaggio ────────────────────────────────────────────────────

async function avviaScreencast(page: Page, dir: string) {
  const cdp = await page.context().newCDPSession(page)
  const tempi: number[] = []
  let n = 0
  cdp.on('Page.screencastFrame', async (f: { data: string; sessionId: number; metadata: { timestamp?: number } }) => {
    writeFileSync(join(dir, `f${String(n).padStart(5, '0')}.jpg`), Buffer.from(f.data, 'base64'))
    tempi.push(f.metadata.timestamp ?? Date.now() / 1000)
    n++
    await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {})
  })
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: W, maxHeight: H, everyNthFrame: 1 })
  return {
    async ferma() {
      await cdp.send('Page.stopScreencast').catch(() => {})
      // lista per ffmpeg: ogni fotogramma resta a schermo fino al successivo
      const righe: string[] = []
      for (let i = 0; i < n; i++) {
        const durata = i < n - 1 ? Math.max(0.001, tempi[i + 1] - tempi[i]) : 0.5
        righe.push(`file 'f${String(i).padStart(5, '0')}.jpg'`, `duration ${durata.toFixed(4)}`)
      }
      righe.push(`file 'f${String(n - 1).padStart(5, '0')}.jpg'`)
      writeFileSync(join(dir, 'fotogrammi.txt'), righe.join('\n') + '\n')
      return n
    },
  }
}

function ffmpeg(args: string[]) {
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: 'inherit' })
}

function monta(dir: string) {
  mkdirSync('docs', { recursive: true })
  const lista = join(dir, 'fotogrammi.txt')
  // mp4: 30 fps costanti, H.264 di buona qualità, riproducibile ovunque
  ffmpeg(['-f', 'concat', '-safe', '0', '-i', lista, '-vf', 'fps=30,format=yuv420p', '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-movflags', '+faststart', MP4])
  creaGif()
}

/**
 * GIF: 960 px, 12 fps, 64 colori senza retinatura; se supera 8 MB si accelera.
 * Il verde dei contatori (#2F9E5B) occupa pochi pixel e la palette lo perderebbe: la palette si calcola
 * sul video più 3 secondi di verde pieno, che servono solo a lei e non finiscono nella GIF.
 */
function creaGif() {
  const durata = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', MP4]).toString())
  console.log(`${MP4}: ${durata.toFixed(1)} s, ${(statSync(MP4).size / 1048576).toFixed(1)} MB`)
  const [w, h] = [960, Math.round((H * 960) / W / 2) * 2]
  for (const velocita of [1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 3]) {
    const vf =
      `[0:v]setpts=PTS/${velocita},fps=12,scale=${w}:${h}:flags=lanczos,format=rgb24,setsar=1,split[a][b];` +
      `color=c=0x2F9E5B:s=${w}x${h}:d=3:r=12,format=rgb24,setsar=1[verde];[a][verde]concat=n=2:v=1[pa];` +
      '[pa]palettegen=max_colors=64:stats_mode=full[p];[b][p]paletteuse=dither=none:diff_mode=rectangle'
    ffmpeg(['-i', MP4, '-filter_complex', vf, GIF])
    const byte = statSync(GIF).size
    console.log(`${GIF}: velocità ${velocita}x, ${(durata / velocita).toFixed(1)} s, ${(byte / 1e6).toFixed(2)} MB`)
    if (byte <= GIF_MAX_BYTE) return
  }
  throw new Error('La GIF supera 8 MB anche a velocità 3x')
}

async function main() {
  if (process.argv.includes('--solo-gif')) return creaGif()
  try {
    await fetch(BASE)
  } catch {
    console.error(`Il dev server non risponde su ${BASE}: avvia prima "npm run dev".`)
    process.exit(1)
  }

  const tmp = mkdtempSync(join(tmpdir(), 'avanzi-demo-'))
  const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu'] })

  try {
    const context = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 })
    await context.addInitScript(CURSORE_FINTO)
    const page = await context.newPage()

    // azzera i dati della demo e riparte dalla prima visita (globo)
    await page.goto(BASE)
    await page.evaluate(() => {
      localStorage.clear()
      sessionStorage.clear()
    })
    await page.goto(BASE)
    await attendiMappa(page)

    const fotogrammi = await avviaScreencast(page, tmp)
    await percorso(page)
    const n = await fotogrammi.ferma()
    await context.close()
    console.log(`${n} fotogrammi catturati`)

    monta(tmp)
  } finally {
    await browser.close()
    rmSync(tmp, { recursive: true, force: true })
  }
}

await main()
