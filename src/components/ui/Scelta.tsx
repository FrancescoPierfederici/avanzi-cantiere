import type { ReactNode } from 'react'

/** Opzione "a pulsante": radio vero (tastiera e screen reader), aspetto da pulsante grande (≥ 48 px). */
export function Scelta({
  nome,
  valore,
  scelto,
  onScegli,
  children,
  className = '',
}: {
  nome: string
  valore: string
  scelto: boolean
  onScegli: () => void
  children: ReactNode
  className?: string
}) {
  return (
    <label
      className={`relative flex min-h-12 cursor-pointer items-center justify-center rounded-etichetta border-2 border-asfalto px-3 py-2 text-center has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-asfalto ${scelto ? 'bg-asfalto text-cemento' : 'bg-carta hover:bg-cemento-2'} ${className}`}
    >
      <input type="radio" name={nome} value={valore} checked={scelto} onChange={onScegli} className="sr-only" />
      {children}
    </label>
  )
}
