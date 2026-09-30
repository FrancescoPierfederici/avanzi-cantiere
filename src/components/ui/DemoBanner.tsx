export function DemoBanner() {
  return (
    <div role="note" className="sticky top-0 z-50 bg-asfalto text-cemento">
      <p className="mx-auto flex max-w-[1320px] items-center gap-2 px-4 py-1.5 text-[13px] leading-tight sm:px-8">
        <span aria-hidden="true" className="inline-block size-2 shrink-0 rounded-full bg-giallo" />
        Progetto dimostrativo – dati fittizi
      </p>
      {/* nastro di cantiere */}
      <div
        aria-hidden="true"
        className="h-1.5"
        style={{ background: 'repeating-linear-gradient(-45deg, var(--color-giallo) 0 8px, var(--color-asfalto) 8px 16px)' }}
      />
    </div>
  )
}
