import { useState, type ReactNode } from 'react'
import { aziendaDi, comuni, kgInCircoloBase, lotti } from '../data'
import { Button } from '../components/ui/Button'
import { DemoBanner } from '../components/ui/DemoBanner'
import { DistanceBadge } from '../components/ui/DistanceBadge'
import { IconaAvanti, IconaPiu, IconaRitiro } from '../components/ui/icone'
import { FotoLotto } from '../components/ui/FotoLotto'
import { KgCounter } from '../components/ui/KgCounter'
import { LotCard } from '../components/ui/LotCard'
import { SearchInput } from '../components/ui/SearchInput'
import { contrasto } from '../lib/contrast'
import { distanzaKm } from '../lib/geo'
import { Link } from '../router'

const C = {
  cemento: '#EDEBE6',
  asfalto: '#1C1C1A',
  giallo: '#FFC21A',
  verde: '#2F9E5B',
  asfalto2: '#5A5852',
}

const SEZIONI = [
  { id: 'colori', titolo: 'Colori' },
  { id: 'caratteri', titolo: 'Caratteri' },
  { id: 'pulsanti', titolo: 'Pulsanti' },
  { id: 'ricerca', titolo: 'Ricerca' },
  { id: 'etichette', titolo: 'Etichette lotto' },
  { id: 'segnali', titolo: 'Distanza e contatore' },
]

const senigallia = comuni.find((c) => c.id === 'senigallia')!
const primoCon = (foto: string) => lotti.find((l) => l.foto.includes(foto))!
const lottiEsempio = ['gres-grigio', 'mattoni', 'lavabo'].map(primoCon)
const stessaFoto = lotti.filter((l) => l.foto.includes('gres-grigio')).slice(0, 6)

export function Styleguide() {
  return (
    <>
      <DemoBanner />
      <a
        href="#contenuto"
        className="sr-only focus:not-sr-only focus:fixed focus:top-12 focus:left-4 focus:z-50 focus:rounded-etichetta focus:bg-giallo focus:px-4 focus:py-3 focus:font-semibold"
      >
        Vai al contenuto
      </a>

      <header className="mx-auto flex max-w-[1320px] items-center justify-between gap-4 px-4 pt-5 sm:px-8">
        <Link to="/" className="flex min-h-12 items-center font-display text-[20px] font-black font-wide tracking-tight">
          Avanzi
        </Link>
        <p className="text-[14px] text-asfalto-2">Tavola visiva, fase 1</p>
      </header>

      <main id="contenuto" className="mx-auto max-w-[1320px] px-4 pb-24 sm:px-8">
        <Hero />

        <div className="mt-14 lg:grid lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-14">
          <nav aria-label="Sezioni della tavola" className="hidden lg:block">
            <ul className="sticky top-16 flex flex-col border-l-2 border-asfalto">
              {SEZIONI.map((s) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className="-ml-[2px] flex min-h-12 items-center border-l-2 border-transparent pl-4 text-[15px] text-asfalto-2 transition-colors hover:border-asfalto hover:text-asfalto"
                  >
                    {s.titolo}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="min-w-0">
            <Colori />
            <Caratteri />
            <Pulsanti />
            <Ricerca />
            <Etichette />
            <Segnali />
          </div>
        </div>
      </main>

      <footer className="border-t-2 border-asfalto">
        <p className="mx-auto max-w-[1320px] px-4 py-6 text-[14px] text-asfalto-2 sm:px-8">
          Progetto dimostrativo – dati fittizi. Aziende, persone, indirizzi e prezzi sono inventati.
        </p>
      </footer>
    </>
  )
}

/* ── Hero ─────────────────────────────────────────────────────────────────── */

function Hero() {
  return (
    <section aria-labelledby="titolo" className="grid gap-8 border-b-2 border-asfalto pt-10 pb-10 sm:pt-16 lg:grid-cols-12 lg:items-end lg:pb-14">
      <div className="lg:col-span-8">
        <h1 id="titolo" className="text-[clamp(76px,19vw,184px)] leading-[0.82] font-black font-wide tracking-[-0.035em]">
          Avanzi
        </h1>
        <p className="mt-6 max-w-[24ch] font-display text-[22px] leading-[1.2] font-semibold font-semiwide sm:text-[30px]">
          Ogni giorno materiale nuovo finisce in discarica. Qui trova un altro cantiere.
        </p>
      </div>
      <div className="lg:col-span-4 lg:justify-self-end">
        <KgCounter kg={kgInCircoloBase} />
        <p className="mt-3 max-w-[34ch] text-[14px] text-asfalto-2">
          Il peso dei {lotti.length} lotti di partenza, rimessi in circolo invece che in discarica. Il verde compare solo nei contatori.
        </p>
      </div>
    </section>
  )
}

/* ── Sezione ──────────────────────────────────────────────────────────────── */

function Sezione({ id, titolo, intro, children }: { id: string; titolo: string; intro: ReactNode; children: ReactNode }) {
  const numero = String(SEZIONI.findIndex((s) => s.id === id) + 1).padStart(2, '0')
  return (
    <section id={id} aria-labelledby={`${id}-t`} className="scroll-mt-14 border-b-2 border-asfalto py-12 first:pt-0 sm:py-16 sm:first:pt-0">
      <h2 id={`${id}-t`} className="text-[30px] leading-none font-extrabold font-wide tracking-[-0.02em] sm:text-[40px]">
        <span aria-hidden="true" className="stencil mr-[0.4em] font-black text-asfalto-2">
          {numero}
        </span>
        {titolo}
      </h2>
      <p className="mt-3 max-w-[62ch] text-[16px] leading-relaxed text-asfalto-2">{intro}</p>
      <div className="mt-8">{children}</div>
    </section>
  )
}

/* ── Colori ───────────────────────────────────────────────────────────────── */

const PALETTE = [
  { nome: 'Cemento', hex: C.cemento, ruolo: 'Lo sfondo di tutto. Luce diffusa, non bianco puro.', testo: C.asfalto },
  { nome: 'Asfalto', hex: C.asfalto, ruolo: 'Testo, globo, superfici scure e bordi delle etichette.', testo: C.cemento },
  { nome: 'Giallo segnaletica', hex: C.giallo, ruolo: 'Azioni e lotti. Sempre come fondo, mai come testo su chiaro.', testo: C.asfalto },
  { nome: 'Verde', hex: C.verde, ruolo: 'Solo i contatori dei kg: rimessi in circolo, salvati dalla discarica.', testo: C.asfalto },
]

const COPPIE: { testo: string; fondo: string; nome: string; nota?: string }[] = [
  { testo: C.asfalto, fondo: C.cemento, nome: 'Asfalto su cemento' },
  { testo: C.asfalto, fondo: C.giallo, nome: 'Asfalto su giallo' },
  { testo: C.asfalto2, fondo: C.cemento, nome: 'Testo secondario su cemento' },
  { testo: C.verde, fondo: C.asfalto, nome: 'Verde su asfalto' },
  { testo: C.verde, fondo: C.cemento, nome: 'Verde su cemento', nota: 'Per questo il contatore vive su asfalto.' },
  { testo: C.giallo, fondo: C.cemento, nome: 'Giallo su cemento', nota: 'Il giallo resta un fondo.' },
]

function esito(r: number): string {
  if (r >= 7) return 'AAA'
  if (r >= 4.5) return 'AA'
  if (r >= 3) return 'Solo testo grande'
  return 'Non per testo'
}

function Colori() {
  return (
    <Sezione id="colori" titolo="Colori" intro="Quattro colori presi dal cantiere: il cemento del piazzale, l'asfalto della strada, il giallo dei segnali, il verde di chi recupera. Nient'altro.">
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {PALETTE.map((p) => (
          <li key={p.nome} className="flex flex-col">
            <div className="flex h-36 items-end rounded-etichetta border-2 border-asfalto p-3" style={{ background: p.hex, color: p.testo }}>
              <span className="num text-[15px] font-semibold">{p.hex}</span>
            </div>
            <h3 className="mt-3 text-[17px] font-bold font-semiwide">{p.nome}</h3>
            <p className="mt-1 text-[14px] leading-snug text-asfalto-2">{p.ruolo}</p>
          </li>
        ))}
      </ul>

      <h3 className="mt-12 text-[19px] font-bold font-semiwide">Contrasto verificato</h3>
      <table className="mt-4 w-full border-collapse text-left text-[15px]">
        <caption className="sr-only">Rapporti di contrasto WCAG tra le coppie di colori</caption>
        <thead>
          <tr className="border-b-2 border-asfalto text-[13px] text-asfalto-2">
            <th scope="col" className="w-14 py-2 font-normal sm:w-20">
              <span className="sr-only">Esempio</span>
            </th>
            <th scope="col" className="py-2 font-normal">Coppia</th>
            <th scope="col" className="py-2 text-right font-normal">Rapporto</th>
            <th scope="col" className="hidden py-2 pl-6 font-normal sm:table-cell">Uso</th>
          </tr>
        </thead>
        <tbody>
          {COPPIE.map((c) => {
            const r = contrasto(c.testo, c.fondo)
            const ok = r >= 4.5
            return (
              <tr key={c.nome} className="border-b border-asfalto/20 align-middle">
                <td className="py-2.5">
                  <span aria-hidden="true" className="grid h-10 w-12 place-items-center rounded-etichetta border border-asfalto/30 font-display text-[18px] font-extrabold sm:w-16" style={{ background: c.fondo, color: c.testo }}>
                    Aa
                  </span>
                </td>
                <td className="py-2.5 pr-3">
                  <span className="font-medium">{c.nome}</span>
                  {c.nota && <span className="block text-[13px] text-asfalto-2">{c.nota}</span>}
                  <span className="mt-0.5 block text-[13px] text-asfalto-2 sm:hidden">{esito(r)}</span>
                </td>
                <td className="num py-2.5 text-right font-semibold whitespace-nowrap">{r.toFixed(1).replace('.', ',')}:1</td>
                <td className="hidden py-2.5 pl-6 sm:table-cell">
                  <span className={`inline-flex h-7 items-center rounded-etichetta px-2 text-[13px] font-semibold ${ok ? 'bg-asfalto text-cemento' : 'border border-dashed border-asfalto text-asfalto'}`}>
                    {esito(r)}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </Sezione>
  )
}

/* ── Caratteri ────────────────────────────────────────────────────────────── */

const SPECIMEN: { ruolo: string; spec: string; esempio: ReactNode }[] = [
  {
    ruolo: 'Display',
    spec: 'Archivo Black, larghezza 125%, interlinea 0,82',
    esempio: <span className="block font-display text-[clamp(56px,11vw,112px)] leading-[0.82] font-black font-wide tracking-[-0.035em]">Avanzi</span>,
  },
  {
    ruolo: 'Titolo',
    spec: 'Archivo ExtraBold, larghezza 125%, 40/40',
    esempio: <span className="block font-display text-[30px] leading-none font-extrabold font-wide tracking-[-0.02em] sm:text-[40px]">Piastrelle cercano casa</span>,
  },
  {
    ruolo: 'Titolo lotto',
    spec: 'Archivo Bold, larghezza 112,5%, 19/23',
    esempio: <span className="block font-display text-[19px] leading-[1.2] font-bold font-semiwide">Gres 60x60 grigio cemento</span>,
  },
  {
    ruolo: 'Testo',
    spec: 'Inter Regular, 16/25, massimo 65 caratteri',
    esempio: (
      <span className="block max-w-[62ch] text-[16px] leading-[1.55]">
        86,4 m² di gres porcellanato, colore grigio cemento. Avanzo di cantiere: ordine sovrastimato. Materiale nuovo, mai posato, imballi originali.
      </span>
    ),
  },
  {
    ruolo: 'Dati',
    spec: 'JetBrains Mono, cifre tabellari, zero barrato',
    esempio: (
      <span className="num flex flex-wrap gap-x-6 gap-y-1 text-[22px] font-semibold tracking-tight">
        <span>86,4 m²</span>
        <span>1.240 kg</span>
        <span>2,4 km</span>
        <span>AV-JES-0031</span>
      </span>
    ),
  },
]

function Caratteri() {
  return (
    <Sezione id="caratteri" titolo="Caratteri" intro="Archivo largo per dare voce, Inter per spiegare, JetBrains Mono per ogni numero che si misura: metri quadri, chili, chilometri, codici lotto.">
      <dl>
        {SPECIMEN.map((s) => (
          <div key={s.ruolo} className="grid gap-3 border-t border-asfalto/25 py-6 md:grid-cols-[180px_minmax(0,1fr)] md:gap-8">
            <dt>
              <span className="block text-[15px] font-semibold">{s.ruolo}</span>
              <span className="mt-0.5 block text-[13px] leading-snug text-asfalto-2">{s.spec}</span>
            </dt>
            <dd className="min-w-0">{s.esempio}</dd>
          </div>
        ))}
      </dl>
    </Sezione>
  )
}

/* ── Pulsanti ─────────────────────────────────────────────────────────────── */

const STATI = [
  { nome: 'Normale', stato: undefined, disabled: false },
  { nome: 'Passaggio', stato: 'hover', disabled: false },
  { nome: 'Focus da tastiera', stato: 'focus', disabled: false },
  { nome: 'Non disponibile', stato: undefined, disabled: true },
] as const

const VARIANTI = [
  { variante: 'primario', nome: 'Primario', uso: 'Una sola azione principale per schermata.', label: 'Cerca' },
  { variante: 'scuro', nome: 'Scuro', uso: 'Conferme e passi successivi.', label: 'Prenota il ritiro' },
  { variante: 'contorno', nome: 'Contorno', uso: 'Azioni secondarie, uscite.', label: 'Salta intro' },
] as const

function Pulsanti() {
  return (
    <Sezione id="pulsanti" titolo="Pulsanti" intro="Alti almeno 48 px, bordo pieno da 2 px, testo in Archivo. Si premono con un guanto da lavoro e si leggono sotto il sole.">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left">
          <caption className="sr-only">Varianti e stati dei pulsanti</caption>
          <thead>
            <tr className="border-b-2 border-asfalto text-[13px] text-asfalto-2">
              <th scope="col" className="py-2 pr-4 font-normal">Variante</th>
              {STATI.map((s) => (
                <th key={s.nome} scope="col" className="px-2 py-2 font-normal">
                  {s.nome}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {VARIANTI.map((v) => (
              <tr key={v.variante} className="border-b border-asfalto/20">
                <th scope="row" className="py-5 pr-4 align-top font-normal">
                  <span className="block text-[15px] font-semibold">{v.nome}</span>
                  <span className="mt-0.5 block max-w-[20ch] text-[13px] leading-snug text-asfalto-2">{v.uso}</span>
                </th>
                {STATI.map((s) => (
                  <td key={s.nome} className="px-2 py-5 align-top">
                    <Button variante={v.variante} data-stato={s.stato} disabled={s.disabled} tabIndex={s.stato ? -1 : undefined} aria-hidden={s.stato ? true : undefined}>
                      {v.label}
                    </Button>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 className="mt-12 text-[19px] font-bold font-semiwide">Con icona, taglia grande</h3>
      <div className="mt-5 flex flex-wrap gap-3">
        <Button taglia="lg" icona={<IconaPiu />}>
          Pubblica un lotto
        </Button>
        <Button taglia="lg" variante="scuro" icona={<IconaRitiro />}>
          Prenota il ritiro
        </Button>
        <Button taglia="lg" variante="contorno" icona={<IconaAvanti />}>
          Salta intro
        </Button>
      </div>
    </Sezione>
  )
}

/* ── Ricerca ──────────────────────────────────────────────────────────────── */

function Ricerca() {
  const [ultima, setUltima] = useState<string | null>(null)
  return (
    <Sezione id="ricerca" titolo="Ricerca" intro="Si scrive come si parla al banco della rivendita. Dalla fase 2 il testo viene scomposto in categoria, misura, colore e comune.">
      <div className="max-w-[720px]">
        <SearchInput onCerca={setUltima} suggerimenti={['gres 60x60 grigio vicino a Senigallia', 'mattoni forati a Jesi', 'porte noce Pesaro']} />
        <p aria-live="polite" className="mt-4 min-h-6 text-[15px] text-asfalto-2">
          {ultima && (
            <>
              Cercheresti <span className="font-semibold text-asfalto">«{ultima}»</span>. La mappa arriva nella fase 2.
            </>
          )}
        </p>
      </div>
    </Sezione>
  )
}

/* ── Etichette lotto ──────────────────────────────────────────────────────── */

function Etichette() {
  return (
    <Sezione
      id="etichette"
      titolo="Etichette lotto"
      intro={`Ogni lotto è un'etichetta di bancale: codice, quantità leggibile da un metro, prezzo contro listino, chi lo vende. Distanze calcolate dal centro di ${senigallia.nome}.`}
    >
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {lottiEsempio.map((l) => {
          const a = aziendaDi(l)
          return (
            <LotCard
              key={l.id}
              lotto={l}
              azienda={a}
              distanzaKm={distanzaKm(senigallia.lat, senigallia.lng, a.lat, a.lng)}
              distanzaDa={senigallia.nome}
            />
          )
        })}
      </div>

      <h3 className="mt-12 text-[19px] font-bold font-semiwide">Stessa foto, lotti diversi</h3>
      <p className="mt-2 max-w-[62ch] text-[15px] leading-relaxed text-asfalto-2">
        Sedici foto per novanta lotti. Ogni lotto riceve un taglio, uno zoom e un verso propri, così due card vicine non sembrano copie.
      </p>
      <ul className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-6">
        {stessaFoto.map((l) => (
          <li key={l.id}>
            <div className="aspect-[3/2] overflow-hidden rounded-etichetta border-2 border-asfalto">
              <FotoLotto lotto={l} decorativa sizes="200px" />
            </div>
            <span className="num mt-1 block text-[12px] text-asfalto-2">{l.codice}</span>
          </li>
        ))}
      </ul>
    </Sezione>
  )
}

/* ── Distanza e contatore ─────────────────────────────────────────────────── */

function Segnali() {
  return (
    <Sezione id="segnali" titolo="Distanza e contatore" intro="La distanza è in linea d'aria, con un decimale sotto i 10 km. Due contatori, con nomi onesti: i kg rimessi in circolo salgono a ogni pubblicazione; i tuoi kg salvati dalla discarica salgono a ogni ritiro prenotato.">
      <div className="flex flex-wrap items-center gap-3">
        <DistanceBadge km={0.8} />
        <DistanceBadge km={2.4} />
        <DistanceBadge km={12.6} />
        <DistanceBadge km={38} />
        <DistanceBadge km={4.1} da="Senigallia" mostraDa />
      </div>

      <div className="mt-10 flex flex-wrap items-start gap-6">
        <KgCounter kg={kgInCircoloBase} />
        <KgCounter kg={1240} taglia="compatto" etichetta="salvati dalla discarica (tuoi)" />
      </div>
    </Sezione>
  )
}
