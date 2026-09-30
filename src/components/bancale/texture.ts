// Texture leggere disegnate in codice (canvas 256 px, niente immagini da scaricare).
// Una per materiale+colore, generata una sola volta e condivisa da tutti i pezzi instanced.
import { CanvasTexture, SRGBColorSpace } from 'three'

export type TipoTexture = 'piastrelle' | 'legno' | 'mattoni' | 'cls' | 'pietra' | 'sacco' | 'isolante' | 'tubo' | 'finestra' | 'cartone'

const LATO = 256
const cache = new Map<string, CanvasTexture>()

/** Variante più chiara/scura di un colore hex (f > 0 schiarisce, f < 0 scurisce). */
function tono(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16)
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(f >= 0 ? v + (255 - v) * f : v * (1 + f)))
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`
}

/** Pseudo-casuale stabile: la stessa texture a ogni caricamento. */
function rng(seme: number) {
  let s = seme >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

function disegna(tipo: TipoTexture, colore: string, g: CanvasRenderingContext2D) {
  const r = rng(tipo.length * 977 + parseInt(colore.slice(1), 16))
  const L = LATO
  g.fillStyle = colore
  g.fillRect(0, 0, L, L)

  switch (tipo) {
    case 'piastrelle': {
      // 2×2 piastrelle con fuga chiara e leggera variazione di tono
      const n = 2
      const s = L / n
      for (let i = 0; i < n; i++)
        for (let j = 0; j < n; j++) {
          g.fillStyle = tono(colore, (r() - 0.5) * 0.12)
          g.fillRect(i * s, j * s, s, s)
        }
      g.fillStyle = tono(colore, 0.45)
      for (let i = 0; i <= n; i++) {
        g.fillRect(i * s - 3, 0, 6, L)
        g.fillRect(0, i * s - 3, L, 6)
      }
      break
    }
    case 'legno': {
      // doghe con venature ondulate
      const doghe = 4
      const h = L / doghe
      for (let d = 0; d < doghe; d++) {
        g.fillStyle = tono(colore, (r() - 0.5) * 0.18)
        g.fillRect(0, d * h, L, h)
        g.strokeStyle = tono(colore, -0.28)
        g.lineWidth = 1.2
        for (let v = 0; v < 7; v++) {
          const y0 = d * h + r() * h
          const amp = 2 + r() * 4
          g.beginPath()
          for (let x = 0; x <= L; x += 8) g.lineTo(x, y0 + Math.sin(x / (18 + r() * 10) + v) * amp)
          g.stroke()
        }
        g.fillStyle = tono(colore, -0.45)
        g.fillRect(0, d * h, L, 2)
      }
      break
    }
    case 'mattoni': {
      // mattoni forati: corsi sfalsati, malta chiara, fori scuri
      const righe = 3
      const h = L / righe
      const w = L / 2
      for (let y = 0; y < righe; y++) {
        const off = y % 2 ? w / 2 : 0
        for (let x = -1; x < 3; x++) {
          const bx = x * w + off
          g.fillStyle = tono(colore, (r() - 0.5) * 0.14)
          g.fillRect(bx + 3, y * h + 3, w - 6, h - 6)
          g.fillStyle = tono(colore, -0.6)
          for (let fi = 0; fi < 4; fi++)
            for (let fj = 0; fj < 2; fj++) g.fillRect(bx + 14 + fi * ((w - 28) / 4), y * h + 14 + fj * ((h - 28) / 2), (w - 28) / 4 - 6, (h - 28) / 2 - 6)
        }
      }
      g.fillStyle = 'rgba(236, 232, 222, 0.9)'
      for (let y = 0; y <= righe; y++) g.fillRect(0, y * h - 3, L, 6)
      break
    }
    case 'cls': {
      // calcestruzzo: grana puntinata e due cavità
      for (let i = 0; i < 900; i++) {
        g.fillStyle = r() > 0.5 ? tono(colore, 0.18) : tono(colore, -0.2)
        g.fillRect(r() * L, r() * L, 1.5, 1.5)
      }
      g.fillStyle = tono(colore, -0.45)
      g.fillRect(L * 0.12, L * 0.25, L * 0.32, L * 0.5)
      g.fillRect(L * 0.56, L * 0.25, L * 0.32, L * 0.5)
      break
    }
    case 'pietra': {
      // listelli a spacco di lunghezza e tono diversi
      const righe = 6
      const h = L / righe
      for (let y = 0; y < righe; y++) {
        let x = -r() * 40
        while (x < L) {
          const w = 40 + r() * 70
          g.fillStyle = tono(colore, (r() - 0.5) * 0.35)
          g.fillRect(x + 2, y * h + 2, w - 4, h - 4)
          x += w
        }
      }
      break
    }
    case 'sacco': {
      // carta con fascia stampata e righe di testo finte
      g.fillStyle = '#FFC21A'
      g.fillRect(0, L * 0.38, L, L * 0.2)
      g.fillStyle = '#1C1C1A'
      g.fillRect(L * 0.12, L * 0.44, L * 0.5, L * 0.07)
      g.fillStyle = tono(colore, -0.3)
      for (let i = 0; i < 4; i++) g.fillRect(L * 0.12, L * 0.68 + i * 14, L * (0.35 + r() * 0.4), 5)
      break
    }
    case 'isolante': {
      // pannelli goffrati: griglia di piccoli rilievi (più chiari: si vedono anche sul grafite)
      g.fillStyle = tono(colore, 0.16)
      for (let x = 8; x < L; x += 16) for (let y = 8; y < L; y += 16) g.fillRect(x, y, 5, 5)
      g.fillStyle = tono(colore, -0.25)
      g.fillRect(0, L / 2 - 2, L, 4)
      break
    }
    case 'tubo': {
      // righe di stampa lungo il tubo
      g.fillStyle = tono(colore, -0.25)
      for (let x = 0; x < L; x += 64) g.fillRect(x, L * 0.45, 36, 6)
      g.fillStyle = tono(colore, 0.2)
      g.fillRect(0, 0, L, 10)
      break
    }
    case 'finestra': {
      // telaio bianco e vetro grigio-azzurro
      g.fillStyle = '#9FB2BC'
      g.fillRect(L * 0.12, L * 0.12, L * 0.76, L * 0.76)
      g.fillStyle = 'rgba(255,255,255,0.35)'
      g.beginPath()
      g.moveTo(L * 0.2, L * 0.8)
      g.lineTo(L * 0.5, L * 0.2)
      g.lineTo(L * 0.6, L * 0.2)
      g.lineTo(L * 0.3, L * 0.8)
      g.fill()
      g.fillStyle = colore
      g.fillRect(L / 2 - 5, L * 0.12, 10, L * 0.76)
      break
    }
    case 'cartone': {
      // cartone ondulato con nastro adesivo
      g.fillStyle = tono(colore, -0.1)
      for (let x = 0; x < L; x += 10) g.fillRect(x, 0, 3, L)
      g.fillStyle = 'rgba(214, 190, 150, 0.95)'
      g.fillRect(L * 0.42, 0, L * 0.16, L)
      break
    }
  }
}

export function texturePer(tipo: TipoTexture, colore: string): CanvasTexture {
  const chiave = `${tipo}:${colore}`
  const esistente = cache.get(chiave)
  if (esistente) return esistente
  const c = document.createElement('canvas')
  c.width = c.height = LATO
  disegna(tipo, colore, c.getContext('2d')!)
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  t.anisotropy = 4
  cache.set(chiave, t)
  return t
}
