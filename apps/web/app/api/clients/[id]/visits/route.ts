import { getClient, listVisitsForClient, registerVisit } from "@blademidia/db";
import { NextResponse } from "next/server";
import { requireSessionApi } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const auth = await requireSessionApi();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const visits = await listVisitsForClient(auth.barbershopId, id);
  return NextResponse.json({ visits });
}

export async function POST(request: Request, { params }: RouteParams) {
  const auth = await requireSessionApi();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  const client = await getClient(auth.barbershopId, id);
  if (!client) {
    return NextResponse.json({ error: "cliente não encontrado" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const serviceLabel = body?.serviceLabel?.trim();
  if (!serviceLabel) {
    return NextResponse.json({ error: "informe o serviço realizado" }, { status: 400 });
  }

  const amountCents =
    typeof body?.amountCents === "number" && Number.isFinite(body.amountCents)
      ? Math.round(body.amountCents)
      : undefined;

  const { visit, payment } = await registerVisit(auth.barbershopId, id, {
    serviceLabel,
    staffLabel: body?.staffLabel?.trim() || undefined,
    occurredAt: body?.occurredAt ? new Date(body.occurredAt) : undefined,
    amountCents,
    method: body?.method,
  });

  return NextResponse.json({ visit, payment }, { status: 201 });
}
