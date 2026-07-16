"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export interface EmployeeLoginInfo {
  id: string;
  emailOrPhone: string;
  active: boolean;
}

interface Props {
  barberId: string;
  initialLogin: EmployeeLoginInfo | null;
}

/** Gestão de login de funcionário — Configurações → Barbeiros & Horários (dono-only na rota). */
export function EmployeeLoginPanel({ barberId, initialLogin }: Props) {
  const router = useRouter();
  const [login, setLogin] = useState(initialLogin);
  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showResetForm, setShowResetForm] = useState(false);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const response = await fetch(`/api/barbers/${barberId}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emailOrPhone, password }),
    });
    setLoading(false);
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error ?? "não foi possível criar o login");
      return;
    }
    const data = await response.json();
    setLogin({ id: data.login.id, emailOrPhone: data.login.emailOrPhone, active: data.login.active });
    setShowCreateForm(false);
    setEmailOrPhone("");
    setPassword("");
    router.refresh();
  }

  async function handleResetPassword(event: React.FormEvent) {
    event.preventDefault();
    if (!login) return;
    setLoading(true);
    setError(null);
    const response = await fetch(`/api/barbers/${barberId}/login`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: login.id, password }),
    });
    setLoading(false);
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error ?? "não foi possível redefinir a senha");
      return;
    }
    setShowResetForm(false);
    setPassword("");
    router.refresh();
  }

  async function handleDeactivate() {
    if (!login) return;
    const confirmed = window.confirm("Desativar este login? O barbeiro não conseguirá mais entrar.");
    if (!confirmed) return;
    setLoading(true);
    const response = await fetch(`/api/barbers/${barberId}/login`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: login.id }),
    });
    setLoading(false);
    if (response.ok) {
      setLogin({ ...login, active: false });
      router.refresh();
    }
  }

  return (
    <section>
      <h2 className="mb-3 font-display text-xl font-bold uppercase text-ink">Login de funcionário</h2>
      {!login ? (
        <div className="card-blade">
          {!showCreateForm ? (
            <button type="button" className="btn-gold" onClick={() => setShowCreateForm(true)}>
              Definir login
            </button>
          ) : (
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="label-blade mb-1 block" htmlFor="emp-login">
                  Email ou telefone
                </label>
                <input
                  id="emp-login"
                  className="input-blade"
                  value={emailOrPhone}
                  onChange={(e) => setEmailOrPhone(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="label-blade mb-1 block" htmlFor="emp-password">
                  Senha
                </label>
                <input
                  id="emp-password"
                  type="password"
                  className="input-blade"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                  required
                />
              </div>
              {error && <p className="text-sm text-alert-red">{error}</p>}
              <button type="submit" disabled={loading} className="btn-gold">
                {loading ? "Salvando..." : "Criar login"}
              </button>
            </form>
          )}
        </div>
      ) : (
        <div className="card-blade space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-body font-medium text-ink">{login.emailOrPhone}</p>
              <span className={login.active ? "badge-ativo" : "badge-inativo"}>
                {login.active ? "Ativo" : "Desativado"}
              </span>
            </div>
            <div className="flex gap-2">
              <button type="button" className="btn-secondary text-sm" onClick={() => setShowResetForm((v) => !v)}>
                Redefinir senha
              </button>
              {login.active && (
                <button
                  type="button"
                  disabled={loading}
                  className="font-mono text-xs text-alert-red"
                  onClick={handleDeactivate}
                >
                  Desativar
                </button>
              )}
            </div>
          </div>

          {showResetForm && (
            <form onSubmit={handleResetPassword} className="flex items-end gap-2">
              <div className="flex-1">
                <label className="label-blade mb-1 block" htmlFor="emp-new-password">
                  Nova senha
                </label>
                <input
                  id="emp-new-password"
                  type="password"
                  className="input-blade"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                  required
                />
              </div>
              <button type="submit" disabled={loading} className="btn-gold">
                {loading ? "Salvando..." : "Salvar"}
              </button>
            </form>
          )}
          {error && <p className="text-sm text-alert-red">{error}</p>}
        </div>
      )}
    </section>
  );
}
