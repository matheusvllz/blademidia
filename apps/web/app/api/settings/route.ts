import { getInactivityThreshold, setInactivityThreshold } from "@blademidia/db";
import { NextResponse } from "next/server";
import { requireSessionApi } from "@/lib/auth";

export async function GET() {
  const auth = await requireSessionApi();
  if (auth instanceof NextResponse) return auth;

  const inactivityDaysThreshold = await getInactivityThreshold(auth.barbershopId);
  return NextResponse.json({ inactivityDaysThreshold });
}

export async function PATCH(request: Request) {
  const auth = await requireSessionApi();
  if (auth instanceof NextResponse) return auth;

  const body = await request.json().catch(() => ({}));
  const days = Number(body?.inactivityDaysThreshold);

  if (!Number.isInteger(days) || days < 1) {
    return NextResponse.json({ error: "informe um número de dias válido (>= 1)" }, { status: 400 });
  }

  const updated = await setInactivityThreshold(auth.barbershopId, days);
  return NextResponse.json({ inactivityDaysThreshold: updated.inactivityDaysThreshold });
}
