import { computeOccupancy } from "@blademidia/core";
import { NextResponse } from "next/server";
import { requireSessionApi } from "@/lib/auth";
import { scopeReadBarberId } from "@/lib/agenda-scope";

/**
 * `GET /api/agenda/occupancy?from=&to=&barberId=` — rota fina sobre
 * `computeOccupancy` (ADR-0010, mesma função usada por `relatorios`). Sem
 * capacidade configurada (sem grade) devolve `available: false`, nunca erro
 * nem divisão por zero (spec "Ocupação sem capacidade configurada").
 * Funcionário (Fase 4) sempre lê a própria ocupação, nunca a de todos.
 */
export async function GET(request: Request) {
  const auth = await requireSessionApi();
  if (auth instanceof NextResponse) return auth;

  const url = new URL(request.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const barberId = scopeReadBarberId(auth, url.searchParams.get("barberId") ?? undefined);

  if (!from || !to) {
    return NextResponse.json({ error: "informe from e to" }, { status: 400 });
  }

  const { occupied, capacity } = await computeOccupancy(auth.barbershopId, from, to, barberId);
  return NextResponse.json({ occupied, capacity, available: capacity > 0 });
}
