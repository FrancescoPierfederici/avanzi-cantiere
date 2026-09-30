import { BarraMobile } from './components/app/MenuApp'
import { MemoriaPiena } from './components/app/MemoriaPiena'
import { Notifiche } from './components/app/Notifiche'
import { Avvisi } from './pages/Avvisi'
import { Home } from './pages/Home'
import { MieiRitiri } from './pages/MieiRitiri'
import { NonTrovata } from './pages/NonTrovata'
import { Pubblica } from './pages/Pubblica'
import { Ritiro } from './pages/Ritiro'
import { SchedaLotto } from './pages/SchedaLotto'
import { Styleguide } from './pages/Styleguide'
import { usePath } from './router'

const ROTTA_LOTTO = /^\/lotto\/([^/]+)\/?$/
const ROTTA_RITIRO = /^\/lotto\/([^/]+)\/ritiro\/?$/

function Pagina({ path }: { path: string }) {
  const p = path.replace(/\/$/, '') || '/'
  if (p === '/styleguide') return <Styleguide />
  if (p === '/pubblica') return <Pubblica />
  if (p === '/avvisi') return <Avvisi />
  if (p === '/i-miei-ritiri') return <MieiRitiri />
  const ritiro = path.match(ROTTA_RITIRO)
  if (ritiro) return <Ritiro key={ritiro[1]} codice={decodeURIComponent(ritiro[1])} />
  const lotto = path.match(ROTTA_LOTTO)
  // key: passando da un lotto a un simile la pagina riparte da capo (focus, 3D, mini-mappa)
  if (lotto) return <SchedaLotto key={lotto[1]} codice={decodeURIComponent(lotto[1])} />
  if (p === '/') return <Home />
  return <NonTrovata key={p} path={p} />
}

export default function App() {
  const path = usePath()
  // su /pubblica in basso ci sono i pulsanti dei passi; la tavola visiva non è l'app
  const barra = !path.startsWith('/pubblica') && !path.startsWith('/styleguide')
  return (
    <>
      <Pagina path={path} />
      {barra && <BarraMobile />}
      <Notifiche />
      <MemoriaPiena />
    </>
  )
}
