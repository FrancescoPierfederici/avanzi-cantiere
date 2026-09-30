// MapLibre 6 cerca il worker accanto al proprio file, ma Vite lo sposta nel bundle:
// gli passo l'URL del worker impacchettato da Vite (formato ES, vedi vite.config.ts).
// Importato da ogni modulo che crea una mappa.
import { setWorkerUrl } from 'maplibre-gl'
import urlWorker from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import 'maplibre-gl/dist/maplibre-gl.css'

setWorkerUrl(urlWorker)
