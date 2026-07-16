"use client";

import type { ReportData, ReportPreset } from "@blademidia/core";
import { useEffect, useState } from "react";
import { PeriodPicker } from "@/components/period-picker";
import { ReportAgendaSummary } from "@/components/report-agenda-summary";
import { ReportRankings } from "@/components/report-rankings";
import { ReportSummary } from "@/components/report-summary";

type Query = { preset: ReportPreset } | { from: string; to: string };

function queryToSearchParams(query: Query): string {
  if ("preset" in query) return `preset=${query.preset}`;
  return `from=${query.from}&to=${query.to}`;
}

export function RelatoriosView() {
  const [query, setQuery] = useState<Query>({ preset: "mes_atual" });
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let canceled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/relatorios?${queryToSearchParams(query)}`)
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body?.error ?? "não foi possível carregar os relatórios");
        return body as ReportData;
      })
      .then((body) => {
        if (!canceled) setData(body);
      })
      .catch((err) => {
        if (!canceled) setError(err instanceof Error ? err.message : "erro inesperado");
      })
      .finally(() => {
        if (!canceled) setLoading(false);
      });
    return () => {
      canceled = true;
    };
  }, [query]);

  const activePreset = "preset" in query ? query.preset : null;
  const fromValue = data?.period.from ?? "";
  const toValue = data?.period.to ?? "";

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-black uppercase text-ink">Relatórios</h1>
        {data && (
          <a
            href={`/api/relatorios/pdf?from=${data.period.from}&to=${data.period.to}`}
            className="btn-secondary"
          >
            Exportar PDF
          </a>
        )}
      </div>

      <PeriodPicker
        activePreset={activePreset}
        fromValue={fromValue}
        toValue={toValue}
        onSelectPreset={(preset) => setQuery({ preset })}
        onSelectCustomRange={(from, to) => setQuery({ from, to })}
      />

      {loading && <p className="text-steel">Carregando...</p>}
      {error && <p className="text-sm text-alert-red">{error}</p>}

      {data && !loading && (
        <>
          <ReportSummary data={data} />
          <ReportAgendaSummary data={data} />
          <ReportRankings data={data} />
        </>
      )}
    </div>
  );
}
