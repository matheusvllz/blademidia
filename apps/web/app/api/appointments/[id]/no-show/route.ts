import { markNoShow } from "@blademidia/core";
import { NextResponse } from "next/server";
import { requireSessionApi } from "@/lib/auth";
import { agendaErrorResponse } from "@/lib/api";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, { params }: RouteParams) {
  const auth = await requireSessionApi();
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const result = await markNoShow(auth.barbershopId, id);
  if (!result.ok) return agendaErrorResponse(result.reason);
  return NextResponse.json({ appointment: result.value });
}
