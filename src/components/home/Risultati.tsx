import { useEffect, useMemo, type Ref } from 'react'
import { comuni } from '../../data'
import { daInquadrare, RAGGIO_INQUADRATURA_KM, type Risultato } from '../../lib/cerca'
import { aggiungiAvviso, useArchivio } from '../../lib/archivio'
import { fotoInLista, ricordaFotoMostrate } from '../../lib/foto'
import { ricordaLottoAperto } from '../../lib/navigazione'
import { Link } from '../../router'
import type { Query } from '../../lib/parser'
import { LotCard } from '../ui/LotCard'
import { SearchInput } from '../ui/SearchInput'

export type CampoFiltro = 'categoria' | 'misura' | 'colore' | 'comune'

type Props = {
  ris: Risultato
  testo: string
  evidenziato: string | null
  onEvidenzia: (id: string | null) => void
  onCerca: (testo: string) => void
  onTogliFiltro: (campo: CampoFiltro) => void
  onVaiAllaMappa?: () => void
  /** mobile: quanti esatti al massimo stanno sulla mappa (gli altri vanno fra i "più lontani") */
  maxInMappa?: number
  titoloRef: Ref<HTMLHeadingElement>
}

function filtri(q: Query): { campo: CampoFiltro; testo: string }[] {
  const out: { campo: CampoFiltro; testo: string }[] = []
  if (q.etichetta) out.push({ campo: 'categoria', testo: q.etichetta })
  if (q.misura) out.push({ campo: 'misura', testo: q.misura.map((n) => String(n).replace('.', ',')).join('x') })
  if (q.colore) out.push({ campo: 'colore', testo: q.colore.join(' ') })
  const luogo = comuni.find((x) => x.id === q.comune)?.nome ?? q.luogo?.nome
  if (luogo) out.push({ campo: 'comune', testo: q.regione ? `${q.regione} · ${luogo}` : luogo })
  return out
}

/**
 * "Altri 11 lotti oltre 25 km, in fondo alla lista." / "Altri 16 lotti più lontani e 9 simili, in fondo alla lista."
 * Su mobile la mappa si ferma ai più vicini: lì "oltre 25 km" non sarebbe sempre vero.
 */
function notaAltri(lontani: number, simili: number, perDistanza: boolean): string {
  const parti: string[] = []
  if (lontani > 0) parti.push(`${lontani} ${lontani === 1 ? 'lotto' : 'lotti'} ${perDistanza ? `oltre ${RAGGIO_INQUADRATURA_KM} km` : lontani === 1 ? 'più lontano' : 'più lontani'}`)
  if (simili > 0) parti.push(`${simili} ${simili === 1 ? 'simile' : 'simili'} della stessa categoria`)
  // "Altri 1 lotto" suona male: con 1 in testa si usa la forma con i due punti
  const primo = lontani > 0 ? lontani : simili
  return primo === 1 ? `In fondo alla lista: ${parti.join(' e ')}.` : `Altri ${parti.join(' e ')}, in fondo alla lista.`
}

// "Ecco altri sanitari": genere e numero scritti a mano, per categoria e per sottotipo
const ALTRI_CATEGORIA: Record<string, string> = {
  'Gres porcellanato': 'altro gres porcellanato',
  Rivestimenti: 'altri rivestimenti',
  Parquet: 'altro parquet',
  'Pietra naturale': 'altra pietra naturale',
  Laterizi: 'altri laterizi',
  Blocchi: 'altri blocchi',
  Isolanti: 'altri isolanti',
  'Malte e premiscelati': 'altre malte e premiscelati',
  'Tubi e raccordi': 'altri tubi e raccordi',
  Sanitari: 'altri sanitari',
  Rubinetteria: 'altra rubinetteria',
  Serramenti: 'altri serramenti',
  'Porte interne': 'altre porte interne',
}
const ALTRI_SOTTOTIPO: Record<string, string> = {
  'Gres effetto legno': 'altro gres effetto legno',
  'Mattoni forati': 'altri mattoni forati',
  Collante: 'altro collante',
  Massetto: 'altro massetto',
  Rasante: 'altro rasante',
  Lavabi: 'altri lavabi',
  'Vasi WC': 'altri vasi WC',
  Bidet: 'altri bidet',
  Portafinestre: 'altre portafinestre',
}

/**
 * Cosa mostra la lista allargata. Se manca proprio il sottotipo ("lavabi"), la lista ha il resto
 * della categoria: "altri sanitari". Se manca solo misura o colore: "altri lavabi".
 */
function eccoAltri(q: Query, allargata: string): string {
  if (!q.categoria) return 'i lotti più simili'
  const sottotipoMancante = !!q.sottotipo && !!q.etichetta && allargata.includes(q.etichetta.toLowerCase())
  if (q.etichetta && !sottotipoMancante && ALTRI_SOTTOTIPO[q.etichetta]) return ALTRI_SOTTOTIPO[q.etichetta]
  return ALTRI_CATEGORIA[q.categoria] ?? 'i lotti più simili'
}

/** "a Senigallia", "ad Ancona" */
const vicinoA = (nome: string) => (/^[aeiou]/i.test(nome) ? `vicino ad ${nome}` : `vicino a ${nome}`)

export function Risultati({ ris, testo, evidenziato, onEvidenzia, onCerca, onTogliFiltro, onVaiAllaMappa, maxInMappa, titoloRef }: Props) {
  const { query: q, riferimento: rif, trovati } = ris
  const n = trovati.length
  const nEsatti = ris.soloZona ? n : ris.nEsatti
  const nSimili = n - nEsatti
  const chip = filtri(q)
  // due card vicine non mostrano mai lo stesso file: le foto della voce si alternano lungo la lista
  const foto = useMemo(() => fotoInLista(trovati.map((t) => t.lotto)), [trovati])
  useEffect(() => {
    ricordaFotoMostrate(Object.fromEntries(trovati.filter((t) => foto.get(t.lotto.id) !== t.lotto.foto).map((t) => [t.lotto.codice, foto.get(t.lotto.id)!])))
  }, [trovati, foto])
  // gli esatti sono ordinati per distanza: quelli sulla mappa vengono prima, i lontani dopo
  const inMappa = new Set(daInquadrare(ris, maxInMappa).map((t) => t.lotto.id))
  const primoLontano = trovati.findIndex((t, i) => i < nEsatti && !inMappa.has(t.lotto.id))
  const nVicini = primoLontano < 0 ? nEsatti : primoLontano
  const nLontani = nEsatti - nVicini
  const titolo = ris.soloZona
    ? `${nVicini} ${nVicini === 1 ? 'lotto' : 'lotti'} ${vicinoA(rif.nome)}`
    : n === 0
      ? `Nessun lotto ${vicinoA(rif.nome)}`
      : nEsatti === 0
        ? `Nessun lotto uguale ${vicinoA(rif.nome)}`
      : `${nVicini} ${nVicini === 1 ? 'lotto trovato' : 'lotti trovati'} ${vicinoA(rif.nome)}`

  return (
    <div className="flex flex-col gap-5">
      {/* key: la casella si riallinea quando cambia la ricerca */}
      <SearchInput key={testo} valoreIniziale={testo} onCerca={onCerca} etichetta="Nuova ricerca" />

      {chip.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="Filtri riconosciuti">
          {chip.map((c) => (
            <li key={c.campo}>
              <button
                type="button"
                onClick={() => onTogliFiltro(c.campo)}
                aria-label={`Togli il filtro ${c.testo}`}
                className="inline-flex min-h-12 items-center gap-2 rounded-etichetta bg-asfalto pr-3 pl-3.5 text-[15px] font-medium text-cemento transition-colors hover:bg-asfalto-3"
              >
                {c.testo}
                <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-giallo">
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div>
        <div className="flex items-end justify-between gap-3">
          <h2 ref={titoloRef} tabIndex={-1} className="text-[24px] leading-[1.1] font-extrabold font-wide tracking-[-0.015em] outline-none sm:text-[28px]">
            {titolo}
          </h2>
          {onVaiAllaMappa && (
            <button
              type="button"
              onClick={onVaiAllaMappa}
              className="min-h-12 shrink-0 rounded-etichetta border-2 border-asfalto px-3.5 font-display text-[14px] font-bold font-semiwide"
            >
              Vedi mappa
            </button>
          )}
        </div>
        <div className="mt-2 space-y-1 text-[15px] leading-snug text-asfalto-2">
          {q.comuneSconosciuto && (
            <p>
              «{q.comuneSconosciuto}» non è un comune italiano. Distanze da {rif.nome}.
            </p>
          )}
          {q.regione && (
            <p>
              {q.regione}: cerco intorno a {rif.nome}, il capoluogo.
            </p>
          )}
          {ris.allargata && n > 0 && (
            <p>
              Nessun risultato per «{ris.allargata}». Ecco {eccoAltri(q, ris.allargata)}, dal più vicino.
            </p>
          )}
          {q.ignorate.length > 0 && <p>Non ho capito «{q.ignorate.join(' ')}», quindi l'ho ignorato.</p>}
          {(nLontani > 0 || (nEsatti > 0 && nSimili > 0)) && <p>{notaAltri(nLontani, nEsatti > 0 ? nSimili : 0, maxInMappa === undefined)}</p>}
          {!ris.allargata && !q.comuneSconosciuto && q.ignorate.length === 0 && <p>Distanze in linea d'aria dal centro di {rif.nome}.</p>}
        </div>
        {!ris.soloZona && <Avvisami ris={ris} testo={testo} />}
      </div>

      {n === 0 ? (
        <div className="rounded-etichetta border-2 border-dashed border-asfalto bg-carta p-5">
          <p className="text-[17px]">Per ora qui non c'è niente di così.</p>
          <p className="mt-1 text-[15px] text-asfalto-2">
            {ris.soloZona ? 'Prova con un materiale:' : "Salva l'avviso qui sopra e ti diciamo quando arriva, oppure prova una ricerca più ampia:"}
          </p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {['Piastrelle', 'Mattoni', 'Sanitari', 'Isolanti'].map((m) => (
              <li key={m}>
                <button
                  type="button"
                  onClick={() => onCerca(`${m.toLowerCase()} ${vicinoA(rif.nome)}`)}
                  className="min-h-12 rounded-etichetta border-2 border-asfalto px-4 font-display text-[15px] font-bold font-semiwide hover:bg-cemento-2"
                >
                  {m}
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[15px] text-asfalto-2">
            Hai tu del materiale avanzato?{' '}
            <Link to="/pubblica" className="font-semibold text-asfalto underline decoration-2 underline-offset-4">
              Pubblica un lotto
            </Link>
          </p>
        </div>
      ) : (
        <ol className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1">
          {trovati.map((t, i) => (
            // clic sulla card (in cattura: prima della navigazione) → si ricorda da dove si è partiti
            <li key={t.lotto.id} onClickCapture={() => ricordaLottoAperto(t.lotto.id)}>
              {i === primoLontano && (
                <p className="mb-5 flex items-center gap-3 pt-2 text-[15px] font-semibold">
                  <span>{maxInMappa === undefined ? `Oltre ${RAGGIO_INQUADRATURA_KM} km` : 'Più lontani'}</span>
                  <span aria-hidden="true" className="h-0 flex-1 border-t-2 border-dashed border-asfalto" />
                </p>
              )}
              {i === nEsatti && nEsatti > 0 && (
                <p className="mb-5 flex items-center gap-3 pt-2 text-[15px] font-semibold">
                  <span>Simili: stessa categoria, misura o colore diversi</span>
                  <span aria-hidden="true" className="h-0 flex-1 border-t-2 border-dashed border-asfalto" />
                </p>
              )}
              <LotCard
                id={`card-${t.lotto.id}`}
                lotto={{ ...t.lotto, foto: foto.get(t.lotto.id) ?? t.lotto.foto }}
                azienda={t.azienda}
                distanzaKm={t.km}
                distanzaDa={rif.nome}
                evidenziato={evidenziato === t.lotto.id}
                priorita={i === 0}
                onMouseEnter={() => onEvidenzia(t.lotto.id)}
                onMouseLeave={() => onEvidenzia(null)}
                onFocus={() => onEvidenzia(t.lotto.id)}
                onBlur={() => onEvidenzia(null)}
              />
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

/** "Avvisami quando arriva": salva la ricerca corrente (filtri + zona, 25 km) come avviso. */
function Avvisami({ ris, testo }: { ris: Risultato; testo: string }) {
  const archivio = useArchivio()
  const giaSalvato = archivio.avvisi.some((a) => a.testo === testo && a.comune === ris.riferimento.id)
  if (giaSalvato) {
    return (
      <p role="status" className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-etichetta border-2 border-asfalto bg-carta px-4 py-3 text-[15px]">
        <span className="font-semibold">Avviso salvato.</span>
        <span className="text-asfalto-2">Ti avvisiamo quando arriva un lotto così entro 25 km.</span>
        {/* città generata: lì non si pubblica, quindi l'avviso non scatterà */}
        {ris.riferimento.zona && (
          <span className="basis-full text-asfalto-2">In questa demo gli avvisi scattano solo nella zona di Senigallia, dove puoi pubblicare.</span>
        )}
        <Link to="/avvisi" className="inline-flex min-h-12 items-center font-semibold underline decoration-2 underline-offset-4">
          I tuoi avvisi
        </Link>
      </p>
    )
  }
  return (
    <button
      type="button"
      onClick={() => {
        const r = ris.riferimento
        aggiungiAvviso({ testo, query: ris.query, comune: r.id, luogo: { nome: r.nome, lat: r.lat, lng: r.lng }, raggioKm: 25 })
      }}
      className="mt-4 inline-flex min-h-12 items-center gap-2.5 rounded-etichetta border-2 border-asfalto bg-carta px-4 font-display text-[15px] font-bold font-semiwide hover:bg-cemento-2"
    >
      <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25">
        <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15L6 16ZM10 20a2 2 0 0 0 4 0" />
      </svg>
      Avvisami quando arriva
    </button>
  )
}
