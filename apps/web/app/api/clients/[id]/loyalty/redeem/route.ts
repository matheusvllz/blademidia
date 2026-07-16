import { getClient, redeemLoyalty } from "@blademidia/db";
import { NextResponse } from "next/server";
import { requireSessionApi } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Marca o resgate de fidelização de um cliente — acessível a ambos os papéis
 * (Premissa do exploration.md: ação operacional do dia a dia, não
 * configuração), sempre escopado ao tenant da sessão.
 */
export async function POST(request: Request, { params }: RouteParams) {
  const auth = await requireSessionApi();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const client = await getClient(auth.barbershopId, id);
  if (!client) {
    return NextResponse.json({ error: "cliente não encontrado" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const visitId = typeof body?.visitId === "string" ? body.visitId : null;

  const redemption = await redeemLoyalty(auth.barbershopId, id, visitId);
  return NextResponse.json({ redemption }, { status: 201 });
}
