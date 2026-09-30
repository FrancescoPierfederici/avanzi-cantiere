# Pubblicare Avanzi su Vercel

Istruzioni passo passo per mettere online la demo, partendo da un repository GitHub **pubblico**.
Non serve saper programmare: si fa quasi tutto dal browser. Conta circa 20 minuti la prima volta.

> Questo file contiene solo istruzioni. Finché non le segui tu, non viene pubblicato niente.

## Prima di iniziare

Ti servono:

- un account [GitHub](https://github.com) (gratuito);
- un account [Vercel](https://vercel.com) (piano gratuito "Hobby"): registrati con "Continue with GitHub",
  così i due account sono già collegati;
- [GitHub Desktop](https://desktop.github.com), il modo più semplice per caricare il progetto senza usare il terminale.

## 1. Metti il progetto su GitHub, come repository pubblico

Prima di pubblicare, due controlli:

- in GitHub → **Settings → Emails** sono attivi **"Keep my email addresses private"** e
  **"Block command line pushes that expose my email"**: i commit usano l'indirizzo `…@users.noreply.github.com`;
- nel progetto non ci sono file `.env` né altri segreti (la demo non ne usa: sono comunque esclusi da `.gitignore`).

Poi:

1. Apri GitHub Desktop e accedi con il tuo account GitHub.
2. Menu **File → Add local repository…** e scegli la cartella del progetto (`avanzi-cantiere`).
3. Premi **Publish repository**.
4. Nella finestra che si apre:
   - lascia il nome `avanzi-cantiere` (o scegline un altro);
   - **togli la spunta a "Keep this code private"**: così il repository è pubblico;
   - premi **Publish repository**.
5. Controlla su github.com: il repository deve avere l'etichetta **Public** accanto al nome, e la pagina
   mostra il README con la GIF della demo.

Le foto sorgente (`assets/lotti/*.jpg`) non vengono caricate: restano sul tuo computer. Il sito usa le WebP
già pronte in `public/lotti`, quindi a Vercel non servono.

## 2. Collega il repository a Vercel

1. Vai su [vercel.com/new](https://vercel.com/new).
2. In **Import Git Repository** cerca `avanzi-cantiere`.
   Se non compare, premi **Adjust GitHub App Permissions** (o "Configure GitHub App"),
   dai a Vercel l'accesso a quel repository e torna indietro.
3. Premi **Import** accanto al repository.

## 3. Controlla le impostazioni e pubblica

Vercel legge da solo il file `vercel.json` del progetto (vedi sotto), quindi di solito basta controllare:

| Campo | Valore |
|---|---|
| Framework Preset | Vite |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Install Command | `npm install` |

Non servono variabili d'ambiente: la demo non usa chiavi né servizi a pagamento.

Premi **Deploy**. Dopo un minuto circa compare l'anteprima e un indirizzo tipo `avanzi-cantiere.vercel.app`.

**Versione di Node.** Se la build si ferma con un errore sulla versione di Node, vai in
**Settings → General → Node.js Version**, scegli **22.x** e rilancia con **Deployments → … → Redeploy**.

## Il file vercel.json

È già nella cartella principale del progetto. Contiene:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "vite",
  "installCommand": "npm install",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

- `buildCommand` e `outputDirectory`: come costruire il sito e dove si trova il risultato (la cartella `dist`).
- `rewrites` è il **fallback SPA**. Avanzi è un'unica pagina che cambia contenuto da sola: indirizzi come
  `/lotto/AV-SEN-7831` o `/avvisi` non sono file veri. Senza questa riga, chi apre uno di quei link
  direttamente (o ricarica la pagina) vedrebbe un errore 404 di Vercel. Con questa riga Vercel risponde
  sempre con `index.html` e l'app mostra la pagina giusta. I file veri (foto, font, script) vengono serviti
  normalmente, perché Vercel controlla prima se il file esiste.

## 4. Controlli dopo la pubblicazione

Apri una **finestra in incognito** (così non c'è niente di salvato) e prova, sostituendo
`TUO-INDIRIZZO` con quello che ti ha dato Vercel:

1. `https://TUO-INDIRIZZO/`: compaiono globo, frase e ricerca; la striscia "Progetto dimostrativo – dati fittizi" è in alto.
2. **Link diretto a un lotto**: incolla `https://TUO-INDIRIZZO/lotto/AV-SEN-7831` nella barra degli indirizzi.
   Deve aprirsi la scheda del lotto, con foto, bancale 3D e mini-mappa. Se vedi "404: NOT_FOUND" di Vercel,
   il file `vercel.json` non è stato letto: controlla che sia nel repository su GitHub, nella cartella principale.
3. **Ricarica** la scheda con F5: deve restare sulla stessa pagina.
4. Prova anche questi link diretti: `/avvisi`, `/i-miei-ritiri`, `/pubblica`,
   `/?q=gres%2060x60%20grigio%20vicino%20a%20Senigallia`.
5. **Indirizzo inesistente**: `https://TUO-INDIRIZZO/pagina-a-caso` deve mostrare la pagina "Pagina non trovata"
   di Avanzi (con il 404 grande tratteggiato), non quella di Vercel.
6. Su una scheda, font e foto devono essere quelli giusti: titoli larghi in Archivo, numeri in carattere a spaziatura fissa.
7. Dal telefono: apri l'indirizzo e fai una ricerca; la lista compare subito e la mappa poco dopo.

## Aggiornamenti futuri

Ogni volta che carichi modifiche su GitHub (in GitHub Desktop: **Commit**, poi **Push origin**),
Vercel ripubblica da solo in un minuto circa. Lo storico è in **Deployments**; da lì, con
**… → Promote** su una versione precedente, puoi tornare indietro.

## Chi può vedere la demo

- Il repository è pubblico: chiunque può leggere il codice, il README e la storia dei commit
  (tutti i diritti restano tuoi: vedi la riga © nel README; nessuna licenza open è concessa).
- **Anche il sito pubblicato è visibile a chiunque abbia l'indirizzo.** La demo chiede già ai motori di ricerca
  di non indicizzarla (`noindex` e `robots.txt`), ma non è protetta da password.
- Per limitarne l'accesso guarda **Settings → Deployment Protection**: le opzioni disponibili (accesso solo con
  account Vercel, password) dipendono dal piano, quindi verifica lì cosa offre il tuo.

## Se qualcosa non va

| Sintomo | Causa probabile |
|---|---|
| 404 di Vercel aprendo `/lotto/...` o ricaricando | `vercel.json` mancante o non nella cartella principale |
| La build fallisce subito | Versione di Node: imposta 22.x (vedi sopra) |
| Pagina bianca | Apri il sito su un computer, premi F12 e guarda la scheda Console: copia l'errore |
| Mappa grigia o vuota | Le tile arrivano da OpenFreeMap: riprova più tardi o controlla la connessione |
