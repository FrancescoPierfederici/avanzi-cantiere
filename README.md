# Avanzi

**Italiano** · [English](README.en.md)

Progetto dimostrativo con dati fittizi: un marketplace locale dove imprese e rivendite pubblicano
materiale edile nuovo avanzato, e chi cerca lo trova sulla mappa. Aziende e persone sono inventate.

## Il problema

A fine cantiere restano bancali di piastrelle, mattoni, sanitari e serramenti nuovi, ordinati in più o mai posati.
Chi li ha non sa a chi darli e spesso finiscono in magazzino o in discarica; chi ne cerca pochi metri quadri
per un bagno o un muretto non sa che esistono, magari a due chilometri da casa.
Avanzi mette in contatto le due parti sulla mappa, lotto per lotto, con il ritiro sul posto.

## Il mio ruolo

Idea, ricerca, UX/UI, direzione visiva e scelte di prodotto sono mie.
Il codice è stato scritto con Claude Code sotto la mia guida, con verifiche su desktop e mobile a ogni passo.

## Demo

[![Demo di Avanzi: ricerca sul globo, volo su Senigallia, scheda con bancale 3D, avviso, pubblicazione, ritiro con QR e volo su Torino](docs/demo.gif)](docs/demo.mp4)

*La GIF è accelerata 2,25×: il [video completo (mp4, 81 s)](docs/demo.mp4) va a velocità normale. Registrato con `npm run demo`.*

## Percorso demo

1. **Cerca a parole.** Sul globo scrivi "gres 60x60 grigio vicino a Senigallia" e premi Invio.
2. **Guarda la zona.** La mappa vola su Senigallia: ogni lotto è una colonna gialla, alta quanto il suo peso, e accanto c'è la lista.
3. **Apri un lotto.** Dalla card entri nella scheda: foto, bancale 3D da ruotare, mini-mappa e lotti simili.
4. **Prenota il ritiro.** Scegli giorno e fascia oraria: ricevi un codice con QR, che trovi poi in "I miei ritiri".
5. **Fatti avvisare.** Cerca qualcosa che non c'è e premi "Avvisami quando arriva".
6. **Pubblica il tuo avanzo.** In "Pubblica" bastano cinque passi: il lotto compare in cima alla lista e il contatore dei kg rimessi in circolo sale.
   Se il lotto corrisponde a un avviso salvato, la notifica arriva subito, anche in un'altra finestra aperta sulla demo.
7. **Cambia città.** Prova "mattoni vicino a Torino" o scrivi una regione ("sicilia"): la mappa vola lì e trova lotti anche là,
   con schede, prenotazione e QR come a Senigallia.

"Azzera i dati della demo", in fondo ad Avvisi e I miei ritiri, riporta tutto allo stato iniziale.

## Scelte tecniche

**Stack:** Vite, React, TypeScript, Tailwind CSS v4, MapLibre GL, three.js (@react-three/fiber).

- **Dal globo alla mappa piatta.** La mappa parte in proiezione globo e, avvicinandosi, passa a Mercator.
  All'arrivo resta in Mercator puro, perché solo così le colonne 3D si possono cliccare.
- **Colonne 3D per peso.** Metri quadri, pezzi e bancali non si confrontano tra loro: l'altezza delle colonne
  (da 80 a 350 m sulla mappa) segue il peso stimato di ogni lotto.
- **Bancale three.js caricato a parte.** Il modello 3D del bancale (@react-three/fiber) è un pacchetto separato,
  scaricato solo quando si apre una scheda.
- **Dati con seed fisso.** Aziende, lotti e prezzi escono da uno script con seed fisso: ogni rigenerazione dà
  lo stesso risultato, e aggiungere una foto cambia solo le foto.
- **localStorage con reset.** Lotti pubblicati, avvisi e ritiri restano nel browser, senza server;
  un pulsante li azzera prima di una presentazione.
- **Foto con srcset.** Ogni foto esiste a 720 e 1200 px: le card prendono la più piccola che basta,
  la scheda la 1200. La qualità WebP è scelta file per file.
- **Tutta Italia, dati generati al momento.** L'elenco dei 7.896 comuni italiani (con le frazioni della zona demo)
  è un file a parte da ~135 KB compressi, scaricato solo quando serve: al primo tocco sulla ricerca.
  Fuori dalla zona di Senigallia lotti e aziende si generano nel browser con lo stesso generatore,
  e un seed ricavato dal nome del comune: stessa città, stessi lotti, anche da un link diretto.
  Le sedi nascono verso l'entroterra, o accanto a località abitate vicine per i comuni sull'acqua.
- **Mappa differita su mobile.** Aprendo i risultati da telefono, MapLibre parte solo dopo che titolo e lista
  sono visibili.

## Design: "Cantiere pulito"

Colori da cantiere: cemento come sfondo, asfalto per il testo e il globo, giallo segnaletica per azioni e lotti.
Il verde compare solo nei contatori dei kg salvati dalla discarica.
Archivo largo per i titoli, Inter per il testo, JetBrains Mono per numeri, misure e codici lotto.
Ogni lotto è un'etichetta di bancale: codice, quantità grande e bordo tratteggiato.
Pensato per il telefono e per l'uso sotto il sole: contrasto alto, pulsanti da almeno 48 px, tastiera e movimento ridotto rispettati.

## Crediti e licenze

- **Mappa:** tile di [OpenFreeMap](https://openfreemap.org), dati © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), schema OpenMapTiles.
  Motore [MapLibre GL JS](https://maplibre.org).
- **Font:** Archivo, Inter e JetBrains Mono, licenza SIL Open Font License 1.1, ospitati in locale
  (testo della licenza in [public/fonts/OFL.txt](public/fonts/OFL.txt)).
- **Foto dei lotti:** generate con AI (Kling). Non ritraggono materiali, aziende o luoghi reali.
- **Comuni italiani:** coordinate e province da [GeoNames](https://www.geonames.org), licenza
  [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Rigenerabili con `npm run comuni`.
- **Dati:** aziende, persone, indirizzi e telefoni sono inventati, anche nelle città generate al momento.

## Autore

Francesco Pierfederici · [LinkedIn](https://www.linkedin.com/in/francescopierfederici/)

© 2026 Francesco Pierfederici. Tutti i diritti riservati.

## Avvio

```sh
npm install
npm run dev       # http://localhost:5173
npm run build     # build di produzione in dist/
npm run preview   # serve la build su http://localhost:4173
```

Altri script:

- `npm run photos` converte le foto di `assets/lotti` in WebP: 1200 px per la scheda, 720 px per le card.
  Le foto sorgente (JPG) non sono incluse nel repository: ci sono già le WebP pronte in `public/lotti`, che bastano per avviare e pubblicare il sito.
- `npm run data` rigenera i dati fittizi in `src/data` (seed fisso, risultato sempre uguale).
- `npm run comuni` rigenera `src/data/comuni-italia.txt` dai dati GeoNames (serve la rete; i file scaricati restano in una cartella temporanea e vengono cancellati).
- `npm run demo` registra il video demo (con `npm run dev` acceso) e crea `docs/demo.mp4` e `docs/demo.gif`. Serve ffmpeg.
- `npm run test:parser` prova il parser della ricerca.

## Prestazioni

Misure Lighthouse sulla build di produzione (una passata, rallentamento simulato):

| Pagina | Desktop | Mobile |
|---|---|---|
| Home | 99 | 63 |
| Risultati | 86 | 53 |
| Scheda lotto | 99 | 87 |

**Il limite su mobile è la mappa.** Avviare MapLibre (WebGL, stile vettoriale, colonne 3D) tiene occupato
il processore di un telefono medio per qualche secondo: è questo che porta i risultati mobile intorno a 50
e il tempo di blocco sopra 1,5 s. Per chi usa la pagina l'effetto è attenuato:

- nei risultati su mobile la mappa parte solo dopo che titolo e lista sono visibili;
- MapLibre è caricata a parte: ritiro e pubblica non la scaricano, e nella scheda arriva solo con la mini-mappa;
- le card usano foto da 720 px, e la 1200 resta solo per la foto principale della scheda, che deve essere nitida.

Scendere ancora vorrebbe dire rinunciare alla mappa nella prima schermata, o sostituirla con un'immagine
statica finché non la si tocca: per questa demo ho scelto di tenerla.

I numeri vengono da Chrome senza finestra, con rallentamento simulato: su un telefono vero conviene
misurare con i DevTools.
