"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Assistant } from "@/components/Assistant";
import { usePrefs, type CopyKey } from "@/lib/prefs";

const links: { href: string; label: CopyKey }[] = [
  { href: "/decide", label: "navDecide" },
  { href: "/method", label: "navMethod" },
  { href: "/compare", label: "navCompare" },
];

export function Frame({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { t } = usePrefs();
  return (
    <div className="dossier min-h-screen">
      <div className="mx-auto min-h-screen max-w-7xl px-4 py-4 md:px-8 md:py-6">
        <header className="no-print mb-5 flex flex-wrap items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-ink font-serif text-lg text-gold">А</span>
            <span>
              <span className="block font-serif text-xl font-semibold leading-none">{t("brand")}</span>
              <span className="mt-1 block text-xs text-ink-soft">{t("brandSub")}</span>
            </span>
          </Link>
          <nav className="flex rounded-full bg-card p-1 shadow-sm">
            {links.map((link) => {
              const active = path === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-full px-4 py-2 text-sm font-semibold ${active ? "bg-ink text-paper" : "text-ink-soft hover:text-ink"}`}
                >
                  {t(link.label)}
                </Link>
              );
            })}
          </nav>
        </header>
        {children}
        <Assistant />
      </div>
    </div>
  );
}
