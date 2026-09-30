import { useEffect, useState } from 'react'
import { lottoPerCodice, useArchivio } from '../lib/archivio'
import { caricaLuoghi } from '../lib/caricaLuoghi'
import { assicuraZona, comuneDaCodice, inZonaDemo, luogoDaCodice } from '../lib/zone'

/**
 * Il lotto di un codice. Per i codici delle città generate (AV-TO-TOR-0412) aperti da un link diretto
 * la zona non esiste ancora: si carica l'elenco dei comuni e la si rigenera, sempre uguale.
 */
export function useLottoDaCodice(codice: string) {
  const archivio = useArchivio()
  const [attesa, setAttesa] = useState(() => !lottoPerCodice(codice, archivio) && !!comuneDaCodice(codice))

  useEffect(() => {
    if (!attesa) return
    let attivo = true
    caricaLuoghi()
      .then((elenco) => {
        const l = luogoDaCodice(codice, elenco)
        if (l && !inZonaDemo(l)) assicuraZona(l)
      })
      .catch(() => {
        /* elenco non disponibile: "Lotto non trovato" */
      })
      .finally(() => attivo && setAttesa(false))
    return () => {
      attivo = false
    }
  }, [attesa, codice])

  return { lotto: attesa ? undefined : lottoPerCodice(codice, archivio), attesa }
}
