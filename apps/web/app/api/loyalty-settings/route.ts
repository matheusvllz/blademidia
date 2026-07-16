import { getLoyaltySettings, updateLoyaltySettings } from "@blademidia/db";
import { NextResponse } from "next/server";
import { requireOwnerSessionApi } from "@/lib/auth";

/** Regras de fidelização — Configurações, dono-only (matriz de autorização do design.md). */
export async function GET() {
  const auth = await requireOwnerSessionApi();
  if (auth instanceof NextResponse) return auth;

  const settings = await getLoyaltySettings(auth.barbershopId);
  return NextResponse.json({ settings });
}

export async function PATCH(request: Request) {
  const auth = await requireOwnerSessionApi();
  if (auth instanceof NextResponse) return auth;

  const body = await request.json().catch(() => ({}));
  const thresholdVisits = Number(body?.thresholdVisits);
  if (!Number.isInteger(thresholdVisits) || thresholdVisits <= 0) {
    return NextResponse.json({ error: "thresholdVisits deve ser um inteiro positivo" }, { status: 400 });
  }

  const settings = await updateLoyaltySettings(auth.barbershopId, thresholdVisits);
  return NextResponse.json({ settings });
}
