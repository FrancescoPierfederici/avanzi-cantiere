// Converte assets/lotti/*.jpg in public/lotti/*.webp (lato lungo 1200px, per la scheda)
// e in public/lotti/720/*.webp (lato lungo 720px, per le card) con ffmpeg.
// La cartella 720 non conta per generate-data: legge solo i .webp in public/lotti.
//
// Qualità scelta file per file: la più alta (fino a Q_MAX) che tiene la 1200 entro PESO_MAX,
// ma mai sotto Q_MIN, dove sulle foto di prova iniziano a vedersi blocchi e sbavature.
// La 720 usa la stessa qualità della sua 1200.
// OUT=cartella per provare senza toccare public/lotti.
import { execFileSync } from 'node:child_process'
import { mkdirSync, readdirSync, statSync } from 'node:fs'
import { basename, extname, join } from 'node:path'

const SRC = 'assets/lotti'
const OUT = process.env.OUT ?? 'public/lotti'
const TAGLIE = [
  { dir: OUT, lato: 1200 },
  { dir: join(OUT, '720'), lato: 720 },
]
const PESO_MAX = 130 * 1024
const Q_MAX = 85
const Q_MIN = 68

for (const t of TAGLIE) mkdirSync(t.dir, { recursive: true })

const scale = (lato) => `scale='if(gt(iw,ih),min(iw,${lato}),-2)':'if(gt(iw,ih),-2,min(ih,${lato}))':flags=lanczos`

function converti(src, out, lato, q) {
  execFileSync('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-i', src,
    '-vf', scale(lato),
    '-c:v', 'libwebp', '-quality', String(q), '-compression_level', '6',
    out,
  ])
  return statSync(out).size
}

for (const file of readdirSync(SRC).filter((f) => /\.(jpe?g|png)$/i.test(f))) {
  const src = join(SRC, file)
  const nome = basename(file, extname(file)) + '.webp'
  const grande = join(OUT, nome)
  // ricerca binaria della qualità più alta che sta nel peso
  let lo = Q_MIN, hi = Q_MAX, q = Q_MIN
  if (converti(src, grande, 1200, Q_MAX) <= PESO_MAX) q = Q_MAX
  else {
    while (lo <= hi) {
      const mid = Math.floor((lo + hi) / 2)
      if (converti(src, grande, 1200, mid) <= PESO_MAX) { q = mid; lo = mid + 1 } else hi = mid - 1
    }
  }
  const kb = (converti(src, grande, 1200, q) / 1024).toFixed(0)
  const kbPiccola = (converti(src, join(OUT, '720', nome), 720, q) / 1024).toFixed(0)
  console.log(`${file.padEnd(20)} q${q}  1200: ${kb} KB  720: ${kbPiccola} KB${q === Q_MIN && kb > PESO_MAX / 1024 ? '  (sopra il peso: tenuta la qualità minima)' : ''}`)
}
