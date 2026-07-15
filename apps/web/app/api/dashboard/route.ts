import { instantToZonedDateISO, zonedDayBounds } from "@blademidia/core";
import {
  countAppointmentsByStatus,
  getBarbershop,
  getDashboard,
  listRecentNoShows,
} from "@blademidia/db";
import { NextResponse } from "next/server";
import { requireSessionApi } from "@/lib/auth";

export async function GET() {
  const auth = await requireSessionApi();
  if (auth instanceof NextResponse) return auth;

  const [dashboard, shop] = await Promise.all([
    getDashboard(auth.barbershopId),
    getBarbershop(auth.barbershopId),
  ]);

  // Fase 2: agenda de hoje + faltas recentes. Sem barbearia (não deveria
  // acontecer com sessão válida) ou sem timezone configurado, cai no estado
  // vazio explícito em vez de erro.
  const timezone = shop?.timezone ?? "America/Sao_Paulo";
  const todayISO = instantToZonedDateISO(new Date(), timezone);
  const { start, end } = zonedDayBounds(todayISO, timezone);

  const [todayByStatus, recentNoShows] = await Promise.all([
    countAppointmentsByStatus(auth.barbershopId, start, end),
    listRecentNoShows(auth.barbershopId, 5),
  ]);

  return NextResponse.json({
    ...dashboard,
    agenda: {
      today: {
        agendado: todayByStatus.agendado ?? 0,
        confirmado: todayByStatus.confirmado ?? 0,
        concluido: todayByStatus.concluido ?? 0,
        faltou: todayByStatus.faltou ?? 0,
      },
      recentNoShows,
    },
  });
}
