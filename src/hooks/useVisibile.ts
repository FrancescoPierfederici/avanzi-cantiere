import { useEffect, useState, type RefObject } from 'react'

/**
 * `vista`: l'elemento è entrato almeno una volta nello schermo (per caricare in lazy);
 * `visibile`: lo è adesso (per fermare le animazioni quando si scorre via).
 */
export function useVisibile(ref: RefObject<HTMLElement | null>, margine = '200px') {
  const [stato, setStato] = useState({ vista: false, visibile: false })
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const oss = new IntersectionObserver(
      ([voce]) => setStato((s) => ({ vista: s.vista || voce.isIntersecting, visibile: voce.isIntersecting })),
      { rootMargin: margine },
    )
    oss.observe(el)
    return () => oss.disconnect()
  }, [ref, margine])
  return stato
}
