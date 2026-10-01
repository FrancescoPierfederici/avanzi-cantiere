import type { Lotto } from '../../data/types'
import { conBase } from '../../router'

type Props = {
  lotto: Lotto
  /** alt vuoto quando la foto è solo decorativa */
  decorativa?: boolean
  className?: string
  /**
   * Larghezza a cui è mostrata, per scegliere fra la versione da 720 e quella da 1200 px.
   * Senza `sizes` (scheda) si usa sempre la 1200.
   */
  sizes?: string
  /** foto principale della pagina (LCP): caricata subito e con priorità alta */
  priorita?: boolean
}

/**
 * Foto del lotto con la sua variazione deterministica.
 * La specchiatura avviene sul contenitore, attorno al centro; lo zoom sull'immagine,
 * verso il punto (posX, posY). Tenendoli separati la foto non esce mai dal riquadro.
 */
export function FotoLotto({ lotto, decorativa = false, className = '', priorita = false, sizes }: Props) {
  const v = lotto.fotoVar
  // solo le foto di catalogo hanno la versione piccola; quelle caricate da te sono già ridotte
  const piccola = sizes && lotto.foto.startsWith('/lotti/') ? lotto.foto.replace('/lotti/', '/lotti/720/') : null
  return (
    <div className={`size-full overflow-hidden ${className}`} style={v.flip ? { transform: 'scaleX(-1)' } : undefined}>
      <img
        src={conBase(lotto.foto)}
        srcSet={piccola ? `${conBase(piccola)} 720w, ${conBase(lotto.foto)} 1200w` : undefined}
        sizes={piccola ? sizes : undefined}
        alt={decorativa ? '' : lotto.fotoAlt}
        width={1200}
        height={900}
        loading={priorita ? 'eager' : 'lazy'}
        fetchPriority={priorita ? 'high' : undefined}
        decoding="async"
        className="size-full object-cover"
        style={{
          objectPosition: `${v.posX}% ${v.posY}%`,
          transformOrigin: `${v.posX}% ${v.posY}%`,
          transform: v.zoom !== 1 ? `scale(${v.zoom})` : undefined,
        }}
      />
    </div>
  )
}
