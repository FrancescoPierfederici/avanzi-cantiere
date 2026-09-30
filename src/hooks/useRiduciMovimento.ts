import { useSyncExternalStore } from 'react'

const query = '(prefers-reduced-motion: reduce)'

function subscribe(cb: () => void) {
  const mq = window.matchMedia(query)
  mq.addEventListener('change', cb)
  return () => mq.removeEventListener('change', cb)
}

export function useRiduciMovimento(): boolean {
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches)
}

const queryDesktop = '(min-width: 1024px)'

function subscribeDesktop(cb: () => void) {
  const mq = window.matchMedia(queryDesktop)
  mq.addEventListener('change', cb)
  return () => mq.removeEventListener('change', cb)
}

/** true da 1024 px in su: pannello laterale + mappa; sotto, lista e poi mappa. */
export function useDesktop(): boolean {
  return useSyncExternalStore(subscribeDesktop, () => window.matchMedia(queryDesktop).matches)
}
