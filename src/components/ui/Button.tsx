import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variante = 'primario' | 'scuro' | 'contorno'
type Taglia = 'md' | 'lg'

const base =
  'inline-flex items-center justify-center gap-2.5 rounded-etichetta border-2 font-display font-bold font-semiwide leading-none whitespace-nowrap ' +
  'transition-[background-color,transform] duration-100 active:translate-y-px select-none ' +
  'disabled:cursor-not-allowed disabled:border-cemento-3 disabled:bg-cemento-2 disabled:text-asfalto-2 disabled:active:translate-y-0 ' +
  // stati forzati, usati solo nella tavola visiva
  'data-[stato=focus]:outline-3 data-[stato=focus]:outline-offset-3 data-[stato=focus]:outline-asfalto'

const varianti: Record<Variante, string> = {
  primario: 'bg-giallo text-asfalto border-asfalto hover:bg-giallo-2 data-[stato=hover]:bg-giallo-2',
  scuro: 'bg-asfalto text-cemento border-asfalto hover:bg-asfalto-3 data-[stato=hover]:bg-asfalto-3',
  contorno: 'bg-transparent text-asfalto border-asfalto hover:bg-asfalto/8 data-[stato=hover]:bg-asfalto/8',
}

const taglie: Record<Taglia, string> = {
  md: 'min-h-12 px-5 text-[15px]',
  lg: 'min-h-14 px-7 text-[17px]',
}

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: Variante
  taglia?: Taglia
  icona?: ReactNode
}

export function Button({ variante = 'primario', taglia = 'md', icona, className = '', children, type = 'button', ...rest }: Props) {
  return (
    <button type={type} className={`${base} ${varianti[variante]} ${taglie[taglia]} ${className}`} {...rest}>
      {icona}
      {children}
    </button>
  )
}
