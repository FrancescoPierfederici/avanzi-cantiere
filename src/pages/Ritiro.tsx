import { lazy, Suspense, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Testata } from '../components/app/Testata'
import { Button } from '../components/ui/Button'
import { DemoBanner } from '../components/ui/DemoBanner'
import { FotoLotto } from '../components/ui/FotoLotto'
import { IconaRitiro } from '../components/ui/icone'
import { KgCounter } from '../components/ui/KgCounter'
import { Scelta } from '../components/ui/Scelta'
import { nomeComune } from '../data'
import type { Lotto } from '../data/types'
import { aziendaDi, kgSalvatiDaTe, prenota, useArchivio, type Prenotazione } from '../lib/archivio'
import { useLottoDaCodice } from '../hooks/useLottoDaCodice'
import { fotoMostrata } from '../lib/foto'
import { etichettaUnita, formatDataLunga, formatEuro, formatKg, formatNumero, perUnita, risparmioTotale } from '../lib/format'
import { urlLotto } from '../lib/navigazione'
import { giorniDiRitiro, partiData, passoQuantita, testoQR } from '../lib/ritiri'
import { Link } from '../router'

const CodiceQR = lazy(() => import('../components/ritiro/CodiceQR'))

const CONTATTI_DEMO = { nome: 'Giulia Demo', telefono: '000 000 0000', email: 'giulia@esempio.demo' }

export function Ritiro({ codice }: { codice: string }) {
  const { lotto: vivo, attesa } = useLottoDaCodice(codice)
  // il lotto si fissa alla prima lettura: dopo la prenotazione la quantità cambia, ma la pagina mostra la conferma
  const [fissato, setFissato] = useState<Lotto | undefined>(undefined)
  if (!fissato && vivo) setFissato({ ...vivo, foto: fotoMostrata(vivo) })
  const lotto = fissato
  const [fatta, setFatta] = useState<Prenotazione | null>(null)
  const titoloRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    document.title = fatta ? `Ritiro prenotato ${fatta.codice} – Avanzi` : 'Prenota il ritiro – Avanzi'
    titoloRef.current?.focus({ preventScroll: true })
    window.scrollTo({ top: 0 })
  }, [fatta, attesa])

  return (
    <>
      <DemoBanner />
      <Testata
        larghezza="max-w-[760px]"
        destra={
          lotto && (
            <Link to={urlLotto(lotto.codice)} className="inline-flex min-h-12 items-center rounded-etichetta border-2 border-asfalto px-4 font-display text-[15px] font-bold font-semiwide hover:bg-asfalto/8">
              Torna al lotto
            </Link>
          )
        }
      />
      <main className="mx-auto max-w-[760px] px-4 pt-5 pb-28 sm:px-8 lg:pb-16">
        {attesa ? (
          <p role="status" className="py-10 text-[17px] font-semibold">
            Carico il lotto <span className="num">{codice}</span>…
          </p>
        ) : !lotto ? (
          <>
            <h1 ref={titoloRef} tabIndex={-1} className="text-[30px] font-extrabold font-wide outline-none">
              Lotto non trovato
            </h1>
            <p className="mt-3 text-[17px] text-asfalto-2">
              Il codice <span className="num">{codice}</span> non corrisponde a nessun lotto della demo.
            </p>
          </>
        ) : fatta ? (
          <Conferma p={fatta} titoloRef={titoloRef} />
        ) : lotto.quantita <= 0 ? (
          <>
            <h1 ref={titoloRef} tabIndex={-1} className="text-[30px] font-extrabold font-wide outline-none">
              Già prenotato
            </h1>
            <p className="mt-3 text-[17px] text-asfalto-2">Questo lotto è stato prenotato per intero. Cerca un lotto simile nella zona.</p>
          </>
        ) : (
          <Modulo lotto={lotto} titoloRef={titoloRef} onFatta={setFatta} />
        )}
      </main>
    </>
  )
}

function Blocco({ titolo, children, nota }: { titolo: string; children: ReactNode; nota?: ReactNode }) {
  return (
    <fieldset className="mt-8 border-t-2 border-asfalto pt-5">
      <legend className="float-left w-full font-display text-[21px] leading-tight font-extrabold font-wide">{titolo}</legend>
      <div className="clear-both pt-1">
        {nota && <p className="mb-3 text-[15px] text-asfalto-2">{nota}</p>}
        {children}
      </div>
    </fieldset>
  )
}

function Modulo({ lotto, titoloRef, onFatta }: { lotto: Lotto; titoloRef: React.RefObject<HTMLHeadingElement | null>; onFatta: (p: Prenotazione) => void }) {
  const azienda = aziendaDi(lotto)
  const comuneAzienda = nomeComune(azienda)
  const passo = passoQuantita(lotto)
  const unita = lotto.unita
  const giorni = useMemo(() => giorniDiRitiro(azienda), [azienda])
  // si può ritirare una parte solo se il lotto contiene almeno due "passi"
  const divisibile = lotto.quantita >= passo * 2

  const [tutto, setTutto] = useState(true)
  const [parte, setParte] = useState(() => (divisibile ? Math.max(passo, Math.floor(lotto.quantita / 2 / passo) * passo) : lotto.quantita))
  const [giorno, setGiorno] = useState(giorni[0].iso)
  const [fascia, setFascia] = useState<string>(giorni[0].fasce[0])
  const [contatti, setContatti] = useState(CONTATTI_DEMO)
  const [pagamento, setPagamento] = useState<'al-ritiro' | 'simulato'>('al-ritiro')
  const [errori, setErrori] = useState<Record<string, string>>({})

  const quantita = tutto ? lotto.quantita : +parte.toFixed(2)
  const totale = Math.round(lotto.prezzo * quantita * 100) / 100
  const risparmio = risparmioTotale(lotto.prezzo, lotto.prezzoListino, quantita)
  const kg = Math.round((lotto.pesoKg * quantita) / lotto.quantita)
  const fasceDelGiorno = giorni.find((g) => g.iso === giorno)!.fasce

  const cambiaParte = (v: number) => {
    const arrotondata = Math.round(v / passo) * passo
    setParte(Math.min(lotto.quantita - passo, Math.max(passo, +arrotondata.toFixed(2))))
  }

  function conferma(e: FormEvent) {
    e.preventDefault()
    const err: Record<string, string> = {}
    if (!contatti.nome.trim()) err.nome = 'Scrivi un nome (anche di fantasia).'
    if (!contatti.telefono.trim()) err.telefono = 'Scrivi un telefono (anche di fantasia).'
    setErrori(err)
    if (Object.keys(err).length) {
      document.getElementById(`contatto-${Object.keys(err)[0]}`)?.focus()
      return
    }
    const p = prenota({
      lottoId: lotto.id,
      lottoCodice: lotto.codice,
      titolo: lotto.titolo,
      quantita,
      unita,
      kg,
      totale,
      risparmio,
      giorno,
      fascia,
      sede: { nome: azienda.nome, indirizzo: azienda.indirizzo },
      contatti,
      pagamento,
    })
    onFatta(p)
  }

  const scatole = passo > 1 ? Math.round(parte / passo) : null

  return (
    <>
      <h1 ref={titoloRef} tabIndex={-1} className="text-[30px] leading-tight font-extrabold font-wide outline-none sm:text-[36px]">
        Prenota il ritiro
      </h1>
      <div className="mt-4 flex gap-4 rounded-etichetta border-2 border-dashed border-asfalto bg-carta p-3">
        <div className="aspect-[4/3] w-28 shrink-0 overflow-hidden rounded-[2px] border-2 border-asfalto sm:w-36">
          <FotoLotto lotto={lotto} decorativa sizes="144px" />
        </div>
        <div className="min-w-0">
          <p className="num text-[14px] font-bold">{lotto.codice}</p>
          <p className="mt-0.5 font-display text-[18px] leading-tight font-bold font-semiwide">{lotto.titolo}</p>
          <p className="mt-1 text-[14px] text-asfalto-2">
            {azienda.nome}, {comuneAzienda}
          </p>
        </div>
      </div>

      <form onSubmit={conferma} noValidate>
        <Blocco titolo="Quanto ritiri">
          <div role="radiogroup" aria-label="Quantità" className="grid gap-2 sm:grid-cols-2">
            <Scelta nome="quanto" valore="tutto" scelto={tutto} onScegli={() => setTutto(true)}>
              <span>
                Tutto il lotto · <span className="num font-semibold">{formatNumero(lotto.quantita)} {etichettaUnita(lotto.quantita, unita)}</span>
              </span>
            </Scelta>
            {divisibile && (
              <Scelta nome="quanto" valore="parte" scelto={!tutto} onScegli={() => setTutto(false)}>
                Una parte
              </Scelta>
            )}
          </div>
          {!tutto && divisibile && (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button type="button" onClick={() => cambiaParte(parte - passo)} aria-label="Meno" className="grid size-12 place-items-center rounded-etichetta border-2 border-asfalto bg-carta text-[24px] font-bold">
                −
              </button>
              <label className="flex items-center gap-2">
                <span className="sr-only">Quantità da ritirare ({unita})</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min={passo}
                  max={lotto.quantita - passo}
                  step={passo}
                  value={parte}
                  onChange={(e) => setParte(Number(e.target.value))}
                  onBlur={(e) => cambiaParte(Number(e.target.value))}
                  className="num h-12 w-28 rounded-etichetta border-2 border-asfalto bg-carta px-3 text-[20px] font-semibold"
                />
                <span className="num text-[18px] font-semibold">{unita}</span>
              </label>
              <button type="button" onClick={() => cambiaParte(parte + passo)} aria-label="Più" className="grid size-12 place-items-center rounded-etichetta border-2 border-asfalto bg-carta text-[24px] font-bold">
                +
              </button>
              {scatole !== null && (
                <p className="w-full text-[14px] text-asfalto-2">
                  {scatole} {scatole === 1 ? 'scatola' : 'scatole'} da {formatNumero(passo)} m²: si ritirano solo scatole intere.
                </p>
              )}
            </div>
          )}
        </Blocco>

        <Blocco titolo="Quando" nota={`Orari di ${azienda.nome}. Domenica chiuso.`}>
          <div role="radiogroup" aria-label="Giorno" className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {giorni.map((g) => {
              const p = partiData(g.iso)
              return (
                <Scelta
                  key={g.iso}
                  nome="giorno"
                  valore={g.iso}
                  scelto={giorno === g.iso}
                  onScegli={() => {
                    setGiorno(g.iso)
                    if (!g.fasce.includes(fascia)) setFascia(g.fasce[0])
                  }}
                  className="flex-col !py-2"
                >
                  <span className="text-[13px]">{p.settimana}</span>
                  <span className="num text-[22px] leading-none font-bold">{p.numero}</span>
                  <span className="text-[13px]">{p.mese}</span>
                </Scelta>
              )
            })}
          </div>
          <div role="radiogroup" aria-label="Fascia oraria" className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {fasceDelGiorno.map((f) => (
              <Scelta key={f} nome="fascia" valore={f} scelto={fascia === f} onScegli={() => setFascia(f)}>
                <span className="num font-semibold">{f}</span>
              </Scelta>
            ))}
          </div>
        </Blocco>

        <Blocco titolo="Contatti" nota="È una demo: i dati sono di fantasia. Non scrivere dati veri.">
          <div className="grid gap-4 sm:grid-cols-2">
            {(
              [
                ['nome', 'Nome', 'text', 'name'],
                ['telefono', 'Telefono', 'tel', 'off'],
                ['email', 'Email (facoltativa)', 'email', 'off'],
              ] as const
            ).map(([campo, etichetta, tipo, auto]) => (
              <label key={campo} className={`block ${campo === 'email' ? 'sm:col-span-2' : ''}`}>
                <span className="text-[14px] font-semibold">{etichetta}</span>
                <input
                  id={`contatto-${campo}`}
                  type={tipo}
                  autoComplete={auto}
                  value={contatti[campo]}
                  onChange={(e) => setContatti((c) => ({ ...c, [campo]: e.target.value }))}
                  aria-invalid={!!errori[campo]}
                  aria-describedby={errori[campo] ? `errore-${campo}` : undefined}
                  className="mt-1 h-12 w-full rounded-etichetta border-2 border-asfalto bg-carta px-3 text-[16px] aria-[invalid=true]:border-[#B3261E]"
                />
                {errori[campo] && (
                  <span id={`errore-${campo}`} className="mt-1 block text-[14px] font-semibold text-[#B3261E]">
                    {errori[campo]}
                  </span>
                )}
              </label>
            ))}
          </div>
        </Blocco>

        <Blocco titolo="Pagamento simulato – demo" nota="Non si paga niente e non ci sono dati di carta: la scelta serve solo a mostrare il percorso.">
          <div role="radiogroup" aria-label="Pagamento" className="grid gap-2 sm:grid-cols-2">
            <Scelta nome="pagamento" valore="al-ritiro" scelto={pagamento === 'al-ritiro'} onScegli={() => setPagamento('al-ritiro')}>
              Paga al ritiro
            </Scelta>
            <Scelta nome="pagamento" valore="simulato" scelto={pagamento === 'simulato'} onScegli={() => setPagamento('simulato')}>
              Paga ora (simulato)
            </Scelta>
          </div>
        </Blocco>

        <section aria-labelledby="riepilogo-t" className="mt-8 rounded-etichetta border-2 border-asfalto bg-carta p-5">
          <h2 id="riepilogo-t" className="font-display text-[21px] leading-tight font-extrabold font-wide">
            Riepilogo
          </h2>
          <dl className="mt-3 grid grid-cols-[1fr_auto] gap-y-1.5 text-[16px]">
            <dt>
              <span className="num">{formatNumero(quantita)}</span> {etichettaUnita(quantita, unita)} × <span className="num">{formatEuro(lotto.prezzo)}</span>
              {perUnita(unita)}
            </dt>
            <dd className="num text-right font-bold">{formatEuro(totale)}</dd>
            <dt className="text-asfalto-2">Risparmio sul nuovo</dt>
            <dd className="num text-right text-asfalto-2">{formatEuro(risparmio)}</dd>
            <dt className="text-asfalto-2">Peso da ritirare</dt>
            <dd className="num text-right text-asfalto-2">{formatKg(kg)}</dd>
            <dt className="text-asfalto-2">Ritiro</dt>
            <dd className="text-right text-asfalto-2">
              {formatDataLunga(giorno)}, <span className="num">{fascia}</span>
            </dd>
          </dl>
          <Button type="submit" taglia="lg" icona={<IconaRitiro />} className="mt-5 w-full">
            Conferma il ritiro
          </Button>
        </section>
      </form>
    </>
  )
}

function Conferma({ p, titoloRef }: { p: Prenotazione; titoloRef: React.RefObject<HTMLHeadingElement | null> }) {
  const archivio = useArchivio()
  return (
    <>
      <p className="font-display text-[15px] font-bold font-semiwide text-asfalto-2">Fatto: il materiale non va in discarica.</p>
      <h1 ref={titoloRef} tabIndex={-1} className="mt-1 text-[30px] leading-tight font-extrabold font-wide outline-none sm:text-[36px]">
        Ritiro prenotato
      </h1>
      <div className="mt-5 rounded-etichetta border-2 border-dashed border-asfalto bg-carta p-5 sm:flex sm:gap-6">
        <div className="mx-auto w-full max-w-[240px] shrink-0 sm:mx-0">
          <Suspense fallback={<div className="aspect-square bg-cemento-2" />}>
            <CodiceQR valore={testoQR(p.codice, p.lottoCodice, p.giorno, p.fascia)} etichetta={`QR del ritiro ${p.codice}`} className="w-full rounded-[2px] border-2 border-asfalto" />
          </Suspense>
        </div>
        <div className="mt-5 sm:mt-0">
          <p className="text-[14px] text-asfalto-2">Codice di ritiro: mostralo in magazzino</p>
          <p className="num mt-1 text-[30px] leading-none font-bold tracking-tight sm:text-[34px]">{p.codice}</p>
          <dl className="mt-4 space-y-2 text-[16px]">
            <div>
              <dt className="text-[13px] text-asfalto-2">Quando</dt>
              <dd className="font-semibold">
                {formatDataLunga(p.giorno)}, <span className="num">{p.fascia}</span>
              </dd>
            </div>
            <div>
              <dt className="text-[13px] text-asfalto-2">Dove</dt>
              <dd className="font-semibold">
                {p.sede.nome}, {p.sede.indirizzo}
              </dd>
            </div>
            <div>
              <dt className="text-[13px] text-asfalto-2">Cosa</dt>
              <dd className="font-semibold">
                <span className="num">{formatNumero(p.quantita)}</span> {etichettaUnita(p.quantita, p.unita)} · {p.titolo}
              </dd>
            </div>
            <div>
              <dt className="text-[13px] text-asfalto-2">Totale</dt>
              <dd className="font-semibold">
                <span className="num">{formatEuro(p.totale)}</span> · {p.pagamento === 'al-ritiro' ? 'si paga al ritiro' : 'pagato (simulato)'}
              </dd>
            </div>
          </dl>
        </div>
      </div>
      <h2 className="mt-8 font-display text-[21px] font-extrabold font-wide">I tuoi kg salvati dalla discarica</h2>
      <KgCounter kg={kgSalvatiDaTe(archivio)} taglia="riga" etichetta="salvati dalla discarica" className="mt-3" />
      <div className="mt-8 flex flex-wrap gap-3">
        <Link to="/i-miei-ritiri" className="inline-flex min-h-12 items-center rounded-etichetta border-2 border-asfalto bg-giallo px-5 font-display text-[15px] font-bold font-semiwide">
          I miei ritiri
        </Link>
        <Link to="/" className="inline-flex min-h-12 items-center rounded-etichetta border-2 border-asfalto px-5 font-display text-[15px] font-bold font-semiwide hover:bg-asfalto/8">
          Cerca altro materiale
        </Link>
      </div>
    </>
  )
}
