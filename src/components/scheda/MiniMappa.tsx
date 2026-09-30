// Mini-mappa della scheda: la sede dell'azienda in giallo. Caricata in lazy con MapLibre.
import { Map as MapLibre } from 'maplibre-gl'
import { useEffect, useRef } from 'react'
import { COLORI, creaStile } from '../../map/stile'
import '../../map/worker'

type Props = {
  lng: number
  lat: number
  nome: string
}

export default function MiniMappa({ lng, lat, nome }: Props) {
  const div = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const map = new MapLibre({
      container: div.current!,
      style: creaStile(),
      center: [lng, lat],
      zoom: 13.5,
      pitch: 0,
      pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
      fadeDuration: 0,
      attributionControl: { compact: true },
      // la pagina scorre: due dita su mobile, Ctrl+rotella su desktop
      cooperativeGestures: true,
      dragRotate: false,
      pitchWithRotate: false,
      locale: {
        'CooperativeGesturesHandler.WindowsHelpText': 'Usa Ctrl + rotella per zoomare la mappa',
        'CooperativeGesturesHandler.MacHelpText': 'Usa ⌘ + rotella per zoomare la mappa',
        'CooperativeGesturesHandler.MobileHelpText': 'Usa due dita per muovere la mappa',
        'AttributionControl.ToggleAttribution': 'Mostra o nascondi i crediti della mappa',
      },
    })
    map.keyboard.disable()
    map.on('load', () => {
      map.addSource('sede', { type: 'geojson', data: { type: 'Feature', geometry: { type: 'Point', coordinates: [lng, lat] }, properties: {} } })
      map.addLayer({
        id: 'sede-alone',
        type: 'circle',
        source: 'sede',
        paint: { 'circle-radius': 18, 'circle-color': COLORI.giallo, 'circle-opacity': 0.25, 'circle-blur': 0.6 },
      })
      map.addLayer({
        id: 'sede',
        type: 'circle',
        source: 'sede',
        paint: { 'circle-radius': 8, 'circle-color': COLORI.giallo, 'circle-stroke-color': COLORI.asfalto, 'circle-stroke-width': 3 },
      })
    })
    return () => map.remove()
  }, [lng, lat])

  return <div ref={div} role="img" aria-label={`Mappa: posizione di ${nome}`} className="size-full" />
}
