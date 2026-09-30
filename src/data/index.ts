import aziendeJson from './aziende.json'
import comuniJson from './comuni.json'
import lottiJson from './lotti.json'
import puntiJson from './punti-italia.json'
import type { Azienda, Comune, Lotto, PuntoDecorativo } from './types'

export const comuni = comuniJson as Comune[]
export const aziende = aziendeJson as Azienda[]
export const lotti = lottiJson as Lotto[]
export const puntiItalia = puntiJson as PuntoDecorativo[]

const aziendePerId = new Map(aziende.map((a) => [a.id, a]))
export const aziendaDi = (lotto: Lotto): Azienda => aziendePerId.get(lotto.aziendaId)!

/** kg dei lotti di partenza: la base del contatore "kg rimessi in circolo" */
export const kgInCircoloBase = lotti.reduce((s, l) => s + l.pesoKg, 0)

/** Nome del comune di un'azienda: della zona demo o di una città generata. */
export const nomeComune = (a: Azienda): string => a.comuneNome ?? comuni.find((c) => c.id === a.comune)?.nome ?? ''
