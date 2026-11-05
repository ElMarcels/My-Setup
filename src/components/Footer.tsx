export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="mt-20 border-t border-line/80">
      <div className="mx-auto flex max-w-7xl flex-col gap-2.5 px-4 py-6 font-mono text-[10px] uppercase tracking-[0.16em] text-faint sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <span>© {year} my-setup</span>
        <span className="hidden sm:block">hecho para escritorios con carácter</span>
        <span className="inline-flex items-center gap-2">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-acid opacity-40" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-acid" />
          </span>
          sistema en línea · v1.0
        </span>
      </div>
    </footer>
  )
}
