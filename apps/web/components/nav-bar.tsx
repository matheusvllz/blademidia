"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/clientes", label: "Clientes" },
  { href: "/agenda", label: "Agenda" },
  { href: "/relatorios", label: "Relatórios" },
  { href: "/configuracoes", label: "Configurações" },
];

export function NavBar() {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === "/login") return null;

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="border-b border-steel/10 bg-ink">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <span className="font-display text-xl font-black uppercase tracking-wide text-chalk">
          BLADE<span className="text-gold">.</span>MÍDIA
        </span>
        <nav className="flex items-center gap-6">
          {LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`font-body text-sm transition ${
                  active ? "text-gold" : "text-chalk/70 hover:text-chalk"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={handleLogout}
            className="font-mono text-xs uppercase text-wire transition hover:text-chalk"
          >
            Sair
          </button>
        </nav>
      </div>
    </header>
  );
}
