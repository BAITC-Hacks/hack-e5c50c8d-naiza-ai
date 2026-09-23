import Link from "next/link";

export function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="dossier min-h-screen">
      <div className="mx-auto min-h-screen max-w-6xl px-4 py-5 md:px-8 md:py-8">
        <header className="no-print mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-4">
          <Link href="/" className="group">
            <p className="text-[11px] uppercase tracking-[0.22em] text-gold">Условный город · бюджет 1 000</p>
            <p className="font-serif text-2xl font-semibold text-ink group-hover:text-gold">Аким на 5 часов</p>
          </Link>
          <nav className="flex gap-4 text-sm text-ink-soft">
            <Link href="/decide" className="hover:text-ink">Решения</Link>
            <Link href="/method" className="hover:text-ink">Как считается</Link>
            <Link href="/compare" className="hover:text-ink">Полка команд</Link>
          </nav>
        </header>
        {children}
      </div>
    </div>
  );
}
