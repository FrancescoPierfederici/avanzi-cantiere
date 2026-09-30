import type { Unita } from '../data/types'

// 'always': in italiano Intl non raggruppa i numeri a 4 cifre (1390 invece di 1.390)
const intero = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 0, useGrouping: 'always' })
const unDecimale = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 1, useGrouping: 'always' })

export function formatNumero(n: number): string {
  return Number.isInteger(n) ? intero.format(n) : unDecimale.format(n)
}

export function formatKg(kg: number): string {
  return `${intero.format(kg)} kg`
}

export function formatKm(km: number): string {
  return km < 10 ? `${unDecimale.format(Math.max(0.1, km))} km` : `${intero.format(km)} km`
}

export function formatEuro(n: number): string {
  const decimali = Number.isInteger(n) ? 0 : 2
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: decimali,
    maximumFractionDigits: decimali,
    useGrouping: 'always',
  }).format(n)
}

export function etichettaUnita(q: number, unita: Unita): string {
  if (unita === 'bancali') return q === 1 ? 'bancale' : 'bancali'
  if (unita === 'pezzi') return q === 1 ? 'pezzo' : 'pezzi'
  return unita
}

export function formatQty(q: number, unita: Unita): string {
  return `${formatNumero(q)} ${etichettaUnita(q, unita)}`
}

/** "/m²", "/pz", "/bancale" */
export function perUnita(unita: Unita): string {
  return unita === 'm²' ? '/m²' : unita === 'pezzi' ? '/pz' : '/bancale'
}

export function scontoPercento(prezzo: number, listino: number): number {
  return Math.round((1 - prezzo / listino) * 100)
}

const mesi = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic']
export function formatData(iso: string): string {
  const [, m, g] = iso.split('-').map(Number)
  return `${g} ${mesi[m - 1]}`
}

/** "27 settembre 2026" */
export function formatDataLunga(iso: string): string {
  const [a, m, g] = iso.split('-').map(Number)
  return new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(Date.UTC(a, m - 1, g))
}

/** Risparmio totale del lotto rispetto al prezzo del nuovo, in euro interi. */
export function risparmioTotale(prezzo: number, listino: number, quantita: number): number {
  return Math.round((listino - prezzo) * quantita)
}
