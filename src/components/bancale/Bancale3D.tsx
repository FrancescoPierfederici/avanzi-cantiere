// Anteprima 3D del bancale. Caricata in lazy: three + fiber + drei stanno in un chunk separato.
import { ContactShadows, Instance, Instances, OrbitControls, RoundedBoxGeometry } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import type { Lotto } from '../../data/types'
import { BANCALE, modelloBancale, type ModelloBancale } from './modello'
import { texturePer } from './texture'

type Props = {
  lotto: Lotto
  riduci: boolean
  /** la sezione è sullo schermo: solo allora gira da sola */
  visibile: boolean
}

const LEGNO = '#B8905A'
const ANGOLO_FISSO = 1.05 // rad dall'alto: si ruota solo attorno alla pila, non sopra o sotto

function Bancali({ m }: { m: ModelloBancale }) {
  return (
    <>
      {m.bancali.map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          {/* piano e tre traversi */}
          <mesh position={[0, BANCALE.y - 0.012, 0]}>
            <boxGeometry args={[BANCALE.x, 0.024, BANCALE.z]} />
            <meshStandardMaterial color={LEGNO} roughness={0.9} />
          </mesh>
          {[-0.33, 0, 0.33].map((dz) => (
            <mesh key={dz} position={[0, 0.06, dz]}>
              <boxGeometry args={[BANCALE.x, 0.1, 0.1]} />
              <meshStandardMaterial color={LEGNO} roughness={0.9} />
            </mesh>
          ))}
        </group>
      ))}
    </>
  )
}

function Pezzi({ m }: { m: ModelloBancale }) {
  const [x, y, z] = m.pezzo
  const tubo = m.forma === 'tubo'
  // texture condivisa da tutti i pezzi: stesse draw call, niente immagini da scaricare
  const mappa = useMemo(() => texturePer(m.texture, m.colore), [m.texture, m.colore])
  return (
    <Instances limit={m.posizioni.length} range={m.posizioni.length}>
      {tubo ? (
        <cylinderGeometry args={[y / 2, y / 2, x, 16]} />
      ) : m.forma === 'sacco' ? (
        <RoundedBoxGeometry args={[x, y, z]} radius={0.045} smoothness={3} />
      ) : (
        <boxGeometry args={[x, y, z]} />
      )}
      <meshStandardMaterial map={mappa} roughness={m.forma === 'lastra' ? 0.5 : 0.85} metalness={0} />
      {m.posizioni.map((p, i) => (
        <Instance key={i} position={p} rotation={tubo ? [0, 0, Math.PI / 2] : [0, 0, 0]} scale={1} />
      ))}
    </Instances>
  )
}

export default function Bancale3D({ lotto, riduci, visibile }: Props) {
  const m = useMemo(() => modelloBancale(lotto), [lotto])
  const controlli = useRef<OrbitControlsImpl>(null)
  const [pronto, setPronto] = useState(false)
  const gira = !riduci && visibile

  // distanza della camera: tutta la pila (e i bancali affiancati) nell'inquadratura
  const misura = Math.max(m.larghezza, m.altezza * 1.4, 1.6)
  // con un solo bancale alto la camera non deve stare troppo vicina
  const distanza = Math.max(misura * 1.2, 2.7)
  const centroY = m.altezza / 2

  // OrbitControls imposta touch-action: none; lo riporto a pan-y così su mobile
  // il trascinamento verticale fa scorrere la pagina e quello orizzontale ruota
  useEffect(() => {
    const el = controlli.current?.domElement as HTMLElement | undefined
    if (el) el.style.touchAction = 'pan-y'
  }, [pronto])

  const ruota = (verso: 1 | -1) => {
    const c = controlli.current
    if (!c) return
    c.setAzimuthalAngle(c.getAzimuthalAngle() + (verso * Math.PI) / 4)
    c.update()
  }

  return (
    <div>
      <div aria-hidden="true" className="relative aspect-[4/3] w-full cursor-grab touch-pan-y active:cursor-grabbing">
        <Canvas
          dpr={[1, 2]}
          frameloop={gira ? 'always' : 'demand'}
          camera={{ fov: 32, position: [distanza * 0.75, centroY + distanza * 0.55, distanza * 0.75], near: 0.1, far: 100 }}
          gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
          onCreated={() => setPronto(true)}
          style={{ touchAction: 'pan-y' }}
        >
          <ambientLight intensity={0.75} />
          <directionalLight position={[3, 5, 2]} intensity={1.6} />
          <directionalLight position={[-3, 2, -2]} intensity={0.35} />
          <Bancali m={m} />
          <Pezzi m={m} />
          {/* ombra calcolata una volta sola: ferma, costa niente per frame */}
          <ContactShadows position={[0, 0, 0]} scale={m.larghezza + 2} blur={2.2} opacity={0.35} far={1.5} frames={1} />
          <OrbitControls
            ref={controlli}
            target={[0, centroY, 0]}
            enableZoom={false}
            enablePan={false}
            enableDamping={!riduci}
            minPolarAngle={ANGOLO_FISSO}
            maxPolarAngle={ANGOLO_FISSO}
            autoRotate={gira}
            autoRotateSpeed={0.7}
          />
        </Canvas>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[14px] leading-snug text-asfalto-2">{m.descrizione}</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => ruota(-1)}
            className="min-h-12 rounded-etichetta border-2 border-asfalto px-3.5 font-display text-[14px] font-bold font-semiwide hover:bg-asfalto/8"
          >
            Ruota a sinistra
          </button>
          <button
            type="button"
            onClick={() => ruota(1)}
            className="min-h-12 rounded-etichetta border-2 border-asfalto px-3.5 font-display text-[14px] font-bold font-semiwide hover:bg-asfalto/8"
          >
            Ruota a destra
          </button>
        </div>
      </div>
    </div>
  )
}
