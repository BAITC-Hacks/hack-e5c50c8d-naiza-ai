"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/decide", label: "Набор" },
  { href: "/method", label: "Формула" },
  { href: "/compare", label: "Команды" },
];

export function Frame({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return (
    <div className="dossier min-h-screen">
      <div className="mx-auto min-h-screen max-w-7xl px-4 py-4 md:px-8 md:py-6">
        <header className="no-print mb-5 flex flex-wrap items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-ink font-serif text-lg text-gold">А</span>
            <span>
              <span className="block font-serif text-xl font-semibold leading-none">Аким на 5 часов</span>
              <span className="mt-1 block text-xs text-ink-soft">100 единиц · 5 мер · 5 районов</span>
            </span>
          </Link>
          <nav className="flex rounded-full bg-white/80 p-1 shadow-sm">
            {links.map((link) => {
              const active = path === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-full px-4 py-2 text-sm font-semibold ${active ? "bg-ink text-cream" : "text-ink-soft hover:text-ink"}`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </header>
        {children}
      </div>
    </div>
  );
}
