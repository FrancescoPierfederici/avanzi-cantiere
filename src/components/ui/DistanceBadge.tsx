import { formatKm } from '../../lib/format'
import { IconaPin } from './icone'

type Props = {
  km: number
  /** "da Senigallia" – letto dagli screen reader, mostrato solo se visibile=true */
  da?: string
  mostraDa?: boolean
  className?: string
}

export function DistanceBadge({ km, da, mostraDa = false, className = '' }: Props) {
  return (
    <span
      className={`num inline-flex h-8 items-center gap-1.5 rounded-etichetta bg-asfalto pr-2.5 pl-2 text-[14px] font-semibold text-cemento ${className}`}
    >
      <IconaPin width={15} height={15} className="text-giallo" />
      <span>
        {formatKm(km)}
        {da && <span className={mostraDa ? 'ml-1 font-sans font-normal text-cemento/80' : 'sr-only'}> da {da}</span>}
      </span>
    </span>
  )
}
