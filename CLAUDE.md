# Avanzi – demo marketplace di materiali edili avanzati

## Cosa è
Case study con dati fittizi: marketplace locale dove imprese e rivendite pubblicano
materiale edile NUOVO avanzato (piastrelle, mattoni, sanitari, serramenti…) e chi cerca lo trova sulla mappa.
Tutti i nomi di aziende e persone sono inventati. Avviso fisso: "Progetto dimostrativo – dati fittizi".
Niente push o deploy senza mia richiesta esplicita.

## Stack
- Vite + React + TypeScript, Tailwind CSS
- MapLibre GL JS (proiezione globo + flyTo + fill-extrusion), tile gratuite OpenFreeMap (nessuna API key)
- @react-three/fiber + drei solo per l'anteprima 3D del bancale
- Nessuna libreria extra senza chiedermelo. Nessuna API a pagamento o con chiave.
- Dati: JSON generati da script con seed fisso (src/data).

## Design – direzione "Cantiere pulito"
- Colori: cemento #EDEBE6 (sfondo), asfalto #1C1C1A (testo/globo), giallo segnaletica #FFC21A (azione/lotti),
  verde #2F9E5B SOLO per i contatori dei kg ("kg rimessi in circolo", "I tuoi kg salvati dalla discarica")
- Font: Archivo (titoli, largo/deciso), Inter (testo), JetBrains Mono (numeri: m², kg, km, codici lotto)
- Card lotto = "etichetta di bancale": codice lotto, quantità grande in mono, bordo tratteggiato
- Mobile first, contrasto alto (uso sotto il sole), pulsanti ≥ 48px

## Regole
- Testi in italiano. Rispetta prefers-reduced-motion. Accessibile da tastiera (WCAG AA).
- Performance: 60fps sulla mappa, niente animazioni pesanti su mobile.

## Note tecniche
- Il campo "Formato" sta solo nella scheda completa del lotto, non nella LotCard.
- Font in locale: public/fonts, solo latin; Archivo 600–900 larghezza 100–125, Inter e JetBrains Mono 400–700.
  Pesi o glifi fuori da questi intervalli vanno in fallback: se servono, riscaricali. Licenza OFL in public/fonts/OFL.txt.
- Deploy: il fallback SPA (ogni percorso → index.html) è in vercel.json, istruzioni in docs/DEPLOY.md; senza, i link diretti
  come /lotto/:codice danno 404.
- Nuove foto: basta aggiungerle in assets/lotti con il prefisso della voce (es. gres-grigio-2.jpg; le JPG non vanno nel repository),
  poi `npm run photos && npm run data`. Cambiano solo foto e fotoVar, non il resto dei dati.
  `photos` crea anche la versione da 720 px in public/lotti/720 (card, via srcset) e sceglie la qualità WebP file per file; la scheda usa la 1200.

## Tutta Italia
- src/data/comuni-italia.txt: comuni GeoNames (CC BY 4.0) + frazioni della zona demo, da `npm run comuni`.
  Pacchetto separato (~135 KB compressi), caricato solo al focus sulla ricerca o per un luogo sconosciuto.
- Fuori da 20 km dai 7 comuni base, lotti e aziende si generano al momento (src/lib/zone.ts) con il generatore
  condiviso src/data/genera.ts. Toccare l'ordine delle chiamate all'rng lì dentro cambia i dati di Senigallia:
  dopo ogni modifica, `npm run data` deve dare git diff vuoto.

## Verifica
Dopo ogni modifica: avvia il dev server, apri con Playwright a 1440px e 390px, screenshot, console senza errori,
correggi PRIMA di dirmi che è fatto. Poi dimmi cosa non ti convince.
