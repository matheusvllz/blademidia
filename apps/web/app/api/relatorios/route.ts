import { aggregateReport, resolvePreset, type ReportPreset } from "@blademidia/core";
import { getBarbershop } from "@blademidia/db";
import { NextResponse } from "next/server";
import { requireOwnerSessionApi } from "@/lib/auth";

const VALID_PRESETS: ReportPreset[] = ["mes_atual", "mes_passado", "semana", "trimestre"];

/**
 * `GET /api/relatorios?preset=` OU `?from=&to=` — indicadores do período
 * (Fase 3). Dono-only (Fase 4, matriz de autorização do design.md).
 */
export async function GET(request: Request) {
  const auth = await requireOwnerSessionApi();
  if (auth instanceof NextResponse) return auth;

  const url = new URL(request.url);
  const presetParam = url.searchParams.get("preset");
  const fromParam = url.searchParams.get("from");
  const toParam = url.searchParams.get("to");

  const shop = await getBarbershop(auth.barbershopId);
  const timezone = shop?.timezone ?? "America/Sao_Paulo";

  let period: { from: string; to: string };
  if (presetParam) {
    if (!VALID_PRESETS.includes(presetParam as ReportPreset)) {
      return NextResponse.json({ error: "preset inválido" }, { status: 400 });
    }
    period = resolvePreset(presetParam as ReportPreset, new Date(), timezone);
  } else if (fromParam && toParam) {
    period = { from: fromParam, to: toParam };
  } else {
    return NextResponse.json({ error: "informe preset ou from/to" }, { status: 400 });
  }

  const result = await aggregateReport(auth.barbershopId, period);
  if (!result.ok) {
    return NextResponse.json({ error: "intervalo inválido: from deve ser <= to" }, { status: 400 });
  }
  return NextResponse.json(result.value);
}
