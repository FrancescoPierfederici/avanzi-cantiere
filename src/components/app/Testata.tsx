import type { ReactNode } from 'react'
import { Link } from '../../router'
import { MenuApp } from './MenuApp'

/** Testata delle pagine interne: logo, menu (desktop) e un'azione a destra (es. "Torna ai risultati"). */
export function Testata({ destra, larghezza = 'max-w-[1200px]' }: { destra?: ReactNode; larghezza?: string }) {
  return (
    <header className={`mx-auto flex ${larghezza} items-center justify-between gap-4 px-4 pt-3 sm:px-8 sm:pt-4`}>
      <Link to="/" className="flex min-h-12 items-center font-display text-[20px] font-black font-wide tracking-tight">
        Avanzi
      </Link>
      <div className="flex items-center gap-3">
        <MenuApp />
        {destra}
      </div>
    </header>
  )
}
