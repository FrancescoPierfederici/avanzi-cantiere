// PRNG deterministico (mulberry32) + helper. Stesso seed → stessi dati.

export type Rng = ReturnType<typeof createRng>

export function createRng(seed: number) {
  let a = seed >>> 0

  function next(): number {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  /** Float in [min, max) */
  function range(min: number, max: number): number {
    return min + next() * (max - min)
  }

  /** Intero in [min, max] */
  function int(min: number, max: number): number {
    return Math.floor(range(min, max + 1))
  }

  function pick<T>(items: readonly T[]): T {
    return items[Math.floor(next() * items.length)]
  }

  function weighted<T>(items: readonly T[], weights: readonly number[]): T {
    const total = weights.reduce((s, w) => s + w, 0)
    let r = next() * total
    for (let i = 0; i < items.length; i++) {
      r -= weights[i]
      if (r < 0) return items[i]
    }
    return items[items.length - 1]
  }

  /** Box–Muller */
  function gaussian(mean = 0, sd = 1): number {
    const u = 1 - next()
    const v = next()
    return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
  }

  function shuffle<T>(items: readonly T[]): T[] {
    const out = [...items]
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(next() * (i + 1))
      ;[out[i], out[j]] = [out[j], out[i]]
    }
    return out
  }

  return { next, range, int, pick, weighted, gaussian, shuffle }
}
