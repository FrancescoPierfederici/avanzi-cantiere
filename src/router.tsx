// Mini-router senza dipendenze: pathname + history API.
import { useSyncExternalStore, type AnchorHTMLAttributes, type MouseEvent } from 'react'

function subscribe(callback: () => void) {
  window.addEventListener('popstate', callback)
  return () => window.removeEventListener('popstate', callback)
}

// Su GitHub Pages il sito vive in una sottocartella (/avanzi-cantiere/): BASE è quel prefisso,
// vuoto in locale e su un dominio proprio.
const BASE = import.meta.env.BASE_URL.replace(/\/$/, '')

/** Aggiunge il prefisso del sito a un percorso interno ("/pubblica", "/lotti/x.webp"). */
export function conBase(p: string): string {
  return BASE && p.startsWith('/') && !p.startsWith('//') ? BASE + p : p
}

function percorso(): string {
  const p = window.location.pathname
  return BASE && p.startsWith(BASE) ? p.slice(BASE.length) || '/' : p
}

export function usePath(): string {
  return useSyncExternalStore(subscribe, percorso)
}

export function navigate(to: string) {
  if (to === percorso()) return
  window.history.pushState(null, '', conBase(to))
  window.dispatchEvent(new PopStateEvent('popstate'))
  window.scrollTo(0, 0)
}

type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & { to: string }

export function Link({ to, onClick, ...rest }: LinkProps) {
  function handleClick(e: MouseEvent<HTMLAnchorElement>) {
    onClick?.(e)
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    e.preventDefault()
    navigate(to)
  }
  return <a href={conBase(to)} onClick={handleClick} {...rest} />
}
