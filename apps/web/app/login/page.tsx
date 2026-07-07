"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emailOrPhone, password }),
    });

    setLoading(false);

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error ?? "não foi possível entrar");
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-lg border border-gold/20 bg-steel p-8"
      >
        <h1 className="mb-1 font-display text-3xl font-black uppercase text-chalk">
          BLADE<span className="text-gold">.</span>MÍDIA
        </h1>
        <p className="mb-6 font-mono text-xs uppercase tracking-wide text-wire">
          Painel de clientes
        </p>

        <label className="mb-1 block text-sm text-chalk/80" htmlFor="emailOrPhone">
          Usuário
        </label>
        <input
          id="emailOrPhone"
          className="mb-4 w-full rounded-md border border-chalk/20 bg-ink px-3 py-2 text-chalk outline-none focus:border-gold"
          value={emailOrPhone}
          onChange={(e) => setEmailOrPhone(e.target.value)}
          autoComplete="username"
          required
        />

        <label className="mb-1 block text-sm text-chalk/80" htmlFor="password">
          Senha
        </label>
        <input
          id="password"
          type="password"
          className="mb-6 w-full rounded-md border border-chalk/20 bg-ink px-3 py-2 text-chalk outline-none focus:border-gold"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />

        {error && <p className="mb-4 text-sm text-alert-red">{error}</p>}

        <button type="submit" disabled={loading} className="btn-gold w-full">
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
